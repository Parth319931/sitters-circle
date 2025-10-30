import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Pet {
  id: string;
  name: string;
  owner_id: string;
  vaccination_due_date: string;
}

interface Profile {
  phone: string;
  full_name: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
    const twilioWhatsAppNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if a specific pet_id was provided for immediate reminder
    const requestBody = await req.json().catch(() => ({}));
    console.log('[Edge Function] Request body:', requestBody);
    
    const { pet_id } = requestBody;
    
    let pets;
    let petsError;

    if (pet_id) {
      // Send immediate reminder for specific pet
      console.log('[Edge Function] Sending immediate reminder for pet:', pet_id);
      const result = await supabase
        .from('pets')
        .select('id, name, owner_id, vaccination_due_date')
        .eq('id', pet_id)
        .single();
      
      pets = result.data ? [result.data] : null;
      petsError = result.error;
      console.log('[Edge Function] Pet query result:', { pets, petsError });
    } else {
      // Calculate the date that is 2 days from now (cron job behavior)
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
      const targetDate = twoDaysFromNow.toISOString().split('T')[0];

      console.log('Checking for pets with vaccination due on:', targetDate);

      // Query pets with vaccination due in 2 days
      const result = await supabase
        .from('pets')
        .select('id, name, owner_id, vaccination_due_date')
        .eq('vaccination_due_date', targetDate);
      
      pets = result.data;
      petsError = result.error;
      console.log('[Edge Function] Cron job pets query result:', { count: pets?.length || 0, petsError });
    }

    if (petsError) {
      console.error('Error fetching pets:', petsError);
      throw petsError;
    }

    console.log(`Found ${pets?.length || 0} pets with upcoming vaccinations`);

    if (!pets || pets.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pets with upcoming vaccinations found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const remindersSent: string[] = [];
    const errors: string[] = [];

    // Send WhatsApp message for each pet
    for (const pet of pets as Pet[]) {
      try {
        // Get owner's phone number
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('phone, full_name')
          .eq('id', pet.owner_id)
          .single();

        if (profileError || !profile) {
          console.error(`[Edge Function] Error fetching profile for owner ${pet.owner_id}:`, profileError);
          errors.push(`Pet ${pet.name}: Owner profile not found`);
          continue;
        }

        const ownerProfile = profile as Profile;
        console.log(`[Edge Function] Owner profile found:`, { name: ownerProfile.full_name, hasPhone: !!ownerProfile.phone });

        if (!ownerProfile.phone) {
          console.warn(`[Edge Function] Owner ${pet.owner_id} has no phone number`);
          errors.push(`Pet ${pet.name}: Owner has no phone number`);
          continue;
        }

        // Format phone number for WhatsApp (must include country code)
        const toNumber = `whatsapp:${ownerProfile.phone}`;
        const fromNumber = `whatsapp:${twilioWhatsAppNumber}`;
        
        console.log(`[Edge Function] WhatsApp numbers - To: ${toNumber}, From: ${fromNumber}`);

        // Calculate days until vaccination
        const daysUntil = pet.vaccination_due_date ? 
          Math.ceil((new Date(pet.vaccination_due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
        
        console.log(`[Edge Function] Days until vaccination for ${pet.name}:`, daysUntil);
        
        // Send WhatsApp message via Twilio
        const message = daysUntil !== null && daysUntil <= 2
          ? `Hi ${ownerProfile.full_name}! 🐾\n\nThis is a reminder that ${pet.name}'s vaccination is due ${daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`} (${pet.vaccination_due_date}).\n\nPlease schedule an appointment with your veterinarian to keep ${pet.name} healthy and protected!`
          : `Hi ${ownerProfile.full_name}! 🐾\n\nThis is a reminder that ${pet.name}'s vaccination is due soon (${pet.vaccination_due_date}).\n\nPlease schedule an appointment with your veterinarian to keep ${pet.name} healthy and protected!`;

        const twilioResponse = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${twilioAccountSid}:${twilioAuthToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: fromNumber,
              To: toNumber,
              Body: message,
            }),
          }
        );

        if (!twilioResponse.ok) {
          const errorData = await twilioResponse.text();
          console.error('[Edge Function] Twilio API error:', errorData);
          errors.push(`Pet ${pet.name}: ${errorData}`);
          continue;
        }

        const twilioData = await twilioResponse.json();
        console.log('[Edge Function] WhatsApp message sent successfully:', twilioData.sid);
        remindersSent.push(`${pet.name} (owner: ${ownerProfile.full_name})`);
      } catch (error) {
        console.error(`Error sending reminder for pet ${pet.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        errors.push(`Pet ${pet.name}: ${errorMessage}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        remindersSent,
        errors,
        totalProcessed: pets.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in vaccination-reminder function:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
