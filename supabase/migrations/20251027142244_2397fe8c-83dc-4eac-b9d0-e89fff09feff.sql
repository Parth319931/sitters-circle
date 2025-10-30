-- Create conversations table for direct messaging between owners and sitters
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  sitter_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(owner_id, sitter_id)
);

-- Enable RLS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view their own conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = owner_id OR 
  auth.uid() IN (SELECT user_id FROM sitters WHERE id = sitter_id)
);

CREATE POLICY "Owners can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Add conversation_id to chat_messages (nullable to maintain backward compatibility)
ALTER TABLE public.chat_messages
ADD COLUMN conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE;

-- Update chat_messages policies to work with conversations too
DROP POLICY "Users can view messages from their bookings" ON public.chat_messages;

CREATE POLICY "Users can view messages from their bookings or conversations"
ON public.chat_messages
FOR SELECT
USING (
  auth.uid() IN (
    SELECT owner_id FROM bookings WHERE bookings.id = chat_messages.booking_id
    UNION
    SELECT sitters.user_id FROM sitters WHERE sitters.id IN (
      SELECT sitter_id FROM bookings WHERE bookings.id = chat_messages.booking_id
    )
    UNION
    SELECT owner_id FROM conversations WHERE conversations.id = chat_messages.conversation_id
    UNION
    SELECT sitters.user_id FROM sitters WHERE sitters.id IN (
      SELECT sitter_id FROM conversations WHERE conversations.id = chat_messages.conversation_id
    )
  )
);

-- Add trigger for updating conversations updated_at
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON public.conversations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();