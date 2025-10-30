-- Make booking_id nullable to support both booking-based and conversation-based chats
ALTER TABLE public.chat_messages
ALTER COLUMN booking_id DROP NOT NULL;