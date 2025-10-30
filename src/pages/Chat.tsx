import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const Chat = () => {
  const { bookingId, sitterId, conversationId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [sitter, setSitter] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!user || (!bookingId && !sitterId && !conversationId)) return;

    const fetchData = async () => {
      try {
        if (bookingId) {
          // Fetch booking-based chat
          const { data: bookingData, error: bookingError } = await supabase
            .from("bookings")
            .select("*, pets (name)")
            .eq("id", bookingId)
            .single();

          if (bookingError) throw bookingError;

          // Fetch sitter profile
          const { data: sitterData } = await supabase
            .from("sitters")
            .select("user_id")
            .eq("id", bookingData.sitter_id)
            .single();

          let enrichedBooking: any = { ...bookingData };
          
          if (sitterData) {
            const { data: sitterProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", sitterData.user_id)
              .single();

            enrichedBooking.sitters = { profiles: sitterProfile };
          }

          setBooking(enrichedBooking);

          // Fetch messages
          const { data: messagesData, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("booking_id", bookingId)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;
          setMessages(messagesData || []);
        } else if (conversationId) {
          // Fetch existing conversation by ID
          const { data: convData, error: convError } = await supabase
            .from("conversations")
            .select("*")
            .eq("id", conversationId)
            .single();

          if (convError) throw convError;
          setConversation(convData);

          // Determine if current user is owner or sitter
          const isOwner = convData.owner_id === user.id;
          const partnerId = isOwner ? convData.sitter_id : convData.owner_id;

          if (isOwner) {
            // Fetch sitter details
            const { data: sitterData } = await supabase
              .from("sitters")
              .select("user_id")
              .eq("id", partnerId)
              .single();

            if (sitterData) {
              const { data: sitterProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", sitterData.user_id)
                .single();

              setSitter({ ...sitterData, profiles: sitterProfile });
            }
          } else {
            // Fetch owner details
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", partnerId)
              .single();

            setSitter({ profiles: ownerProfile });
          }

          // Fetch messages
          const { data: messagesData, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;
          setMessages(messagesData || []);
        } else if (sitterId) {
          // Fetch or create conversation
          const { data: existingConv } = await supabase
            .from("conversations")
            .select("*")
            .eq("owner_id", user.id)
            .eq("sitter_id", sitterId)
            .maybeSingle();

          let newConversationId = existingConv?.id;

          if (!existingConv) {
            // Create new conversation
            const { data: newConv, error: convError } = await supabase
              .from("conversations")
              .insert({ owner_id: user.id, sitter_id: sitterId })
              .select()
              .single();

            if (convError) throw convError;
            newConversationId = newConv.id;
            setConversation(newConv);
          } else {
            setConversation(existingConv);
          }

          // Fetch sitter details
          const { data: sitterData } = await supabase
            .from("sitters")
            .select("user_id")
            .eq("id", sitterId)
            .single();

          if (sitterData) {
            const { data: sitterProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", sitterData.user_id)
              .single();

            setSitter({ ...sitterData, profiles: sitterProfile });
          }

          // Fetch messages
          const { data: messagesData, error: messagesError } = await supabase
            .from("chat_messages")
            .select("*")
            .eq("conversation_id", newConversationId)
            .order("created_at", { ascending: true });

          if (messagesError) throw messagesError;
          setMessages(messagesData || []);
        }
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load chat");
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription
    const channelName = bookingId 
      ? `chat_booking_${bookingId}` 
      : `chat_conversation_${conversationId || conversation?.id}`;
    const filter = bookingId 
      ? `booking_id=eq.${bookingId}` 
      : `conversation_id=eq.${conversationId || conversation?.id}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: filter,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, bookingId, sitterId, conversationId, authLoading, navigate, conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !user || (!bookingId && !conversation?.id) || sending) return;

    setSending(true);
    try {
      const messageData: any = {
        sender_id: user.id,
        message: message.trim(),
      };

      if (bookingId) {
        messageData.booking_id = bookingId;
      } else if (conversation?.id) {
        messageData.conversation_id = conversation.id;
      }

      const { error } = await supabase.from("chat_messages").insert(messageData);

      if (error) throw error;
      setMessage("");
    } catch (error: any) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!booking && !sitter) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">Chat not found</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isOwner = bookingId ? user?.id === booking?.owner_id : true;
  const chatPartnerName = bookingId
    ? (isOwner ? booking?.sitters?.profiles?.full_name || "Sitter" : "Pet Owner")
    : sitter?.profiles?.full_name || "Sitter";
  const chatSubject = bookingId ? `Regarding: ${booking?.pets?.name}` : "Direct Message";

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="h-[calc(100vh-200px)] flex flex-col">
          <CardHeader>
            <CardTitle>Chat with {chatPartnerName}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {chatSubject}
            </p>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col overflow-hidden p-0">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-4 py-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isCurrentUser = msg.sender_id === user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isCurrentUser
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary text-secondary-foreground'
                          }`}
                        >
                          <p className="break-words">{msg.message}</p>
                          <p className={`text-xs mt-1 ${
                            isCurrentUser
                              ? 'text-primary-foreground/70' 
                              : 'text-muted-foreground'
                          }`}>
                            {new Date(msg.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            
            <div className="flex gap-2 p-6 border-t">
              <Input
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
              />
              <Button onClick={handleSendMessage} disabled={sending || !message.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Chat;
