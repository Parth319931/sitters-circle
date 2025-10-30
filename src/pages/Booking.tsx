import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Booking = () => {
  const { sitterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const [selectedPet, setSelectedPet] = useState("");
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [notes, setNotes] = useState("");
  const [pets, setPets] = useState<any[]>([]);
  const [sitter, setSitter] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchPets();
      fetchSitter();
    }
  }, [user]);

  const fetchPets = async () => {
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your pets",
      });
      return;
    }

    setPets(data || []);
  };

  const fetchSitter = async () => {
    if (!sitterId) return;

    const { data, error } = await supabase
      .from("sitters")
      .select("*")
      .eq("id", sitterId)
      .single();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load sitter details",
      });
      return;
    }

    setSitter(data);
  };

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!selectedPet || !date || !duration) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all required fields",
      });
      setSubmitting(false);
      return;
    }

    const durationHours = parseInt(duration);
    const hourlyRate = sitter?.hourly_rate || 25;
    const totalCost = hourlyRate * durationHours;
    const otp = generateOTP();

    const { error } = await supabase.from("bookings").insert({
      owner_id: user?.id,
      sitter_id: sitterId,
      pet_id: selectedPet,
      start_time: date,
      duration_hours: durationHours,
      total_cost: totalCost,
      status: "pending",
      notes: notes || null,
      otp: otp,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create booking",
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: "Booking Request Sent!",
      description: "Waiting for sitter approval. You'll receive your OTP once approved.",
    });
    navigate("/my-bookings");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">Book a Session</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Booking Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="pet">Select Pet</Label>
                <Select value={selectedPet} onValueChange={setSelectedPet} required>
                  <SelectTrigger id="pet">
                    <SelectValue placeholder="Choose your pet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pets.map((pet) => (
                      <SelectItem key={pet.id} value={pet.id}>
                        {pet.name} ({pet.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="date">Date & Time</Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (hours)</Label>
                <Select value={duration} onValueChange={setDuration} required>
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 hour</SelectItem>
                    <SelectItem value="2">2 hours</SelectItem>
                    <SelectItem value="3">3 hours</SelectItem>
                    <SelectItem value="4">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="notes">Special Instructions</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special instructions for the sitter..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>
              
              <div className="bg-secondary p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Rate per hour:</span>
                  <span className="font-semibold">${sitter?.hourly_rate || 25}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="font-semibold">{duration || 0} hours</span>
                </div>
                <div className="border-t border-border pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-primary text-xl">
                      ${(sitter?.hourly_rate || 25) * (parseInt(duration) || 0)}
                    </span>
                  </div>
                </div>
              </div>
              
              <Button type="submit" className="w-full" size="lg" disabled={submitting || pets.length === 0}>
                {submitting ? "Creating Booking..." : pets.length === 0 ? "Add a Pet First" : "Confirm Booking"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Booking;
