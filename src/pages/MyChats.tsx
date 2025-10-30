import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ConversationItem {
  id: string;
  type: 'booking' | 'direct';
  bookingId?: string;
  sitterId?: string;
  conversationId?: string;
  partnerName: string;
  subject: string;
  lastMessage: string | null;
  lastMessageTime: string | null;
  unreadCount?: number;
}

const MyChats = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!user) return;

    fetchUserRole();
    fetchConversations();
  }, [user, authLoading, navigate]);

  const fetchUserRole = async () => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id)
      .single();

    if (data) {
      setUserRole(data.role);
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    try {
      const allConversations: ConversationItem[] = [];

      // Fetch booking-based chats as owner
      const { data: ownerBookings } = await supabase
        .from("bookings")
        .select("id, sitter_id, pets (name)")
        .eq("owner_id", user.id);

      if (ownerBookings) {
        for (const booking of ownerBookings) {
          // Get sitter info
          const { data: sitterData } = await supabase
            .from("sitters")
            .select("user_id")
            .eq("id", booking.sitter_id)
            .single();

          if (sitterData) {
            const { data: sitterProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", sitterData.user_id)
              .single();

            // Get last message
            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("message, created_at")
              .eq("booking_id", booking.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            allConversations.push({
              id: `booking_${booking.id}`,
              type: 'booking',
              bookingId: booking.id,
              partnerName: sitterProfile?.full_name || "Sitter",
              subject: `Regarding: ${booking.pets?.name || "Pet"}`,
              lastMessage: lastMsg?.message || null,
              lastMessageTime: lastMsg?.created_at || null,
            });
          }
        }
      }

      // Fetch booking-based chats as sitter
      const { data: sitterData } = await supabase
        .from("sitters")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (sitterData) {
        const { data: sitterBookings } = await supabase
          .from("bookings")
          .select("id, owner_id, pets (name)")
          .eq("sitter_id", sitterData.id);

        if (sitterBookings) {
          for (const booking of sitterBookings) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", booking.owner_id)
              .single();

            // Get last message
            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("message, created_at")
              .eq("booking_id", booking.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            allConversations.push({
              id: `booking_${booking.id}`,
              type: 'booking',
              bookingId: booking.id,
              partnerName: ownerProfile?.full_name || "Pet Owner",
              subject: `Regarding: ${booking.pets?.name || "Pet"}`,
              lastMessage: lastMsg?.message || null,
              lastMessageTime: lastMsg?.created_at || null,
            });
          }
        }
      }

      // Fetch direct conversations as owner
      const { data: ownerConversations } = await supabase
        .from("conversations")
        .select("id, sitter_id")
        .eq("owner_id", user.id);

      if (ownerConversations) {
        for (const conv of ownerConversations) {
          const { data: sitterInfo } = await supabase
            .from("sitters")
            .select("user_id")
            .eq("id", conv.sitter_id)
            .single();

          if (sitterInfo) {
            const { data: sitterProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", sitterInfo.user_id)
              .single();

            // Get last message
            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("message, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            allConversations.push({
              id: `conv_${conv.id}`,
              type: 'direct',
              conversationId: conv.id,
              sitterId: conv.sitter_id,
              partnerName: sitterProfile?.full_name || "Sitter",
              subject: "Direct Message",
              lastMessage: lastMsg?.message || null,
              lastMessageTime: lastMsg?.created_at || null,
            });
          }
        }
      }

      // Fetch direct conversations as sitter
      if (sitterData) {
        const { data: sitterConversations } = await supabase
          .from("conversations")
          .select("id, owner_id")
          .eq("sitter_id", sitterData.id);

        if (sitterConversations) {
          for (const conv of sitterConversations) {
            const { data: ownerProfile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", conv.owner_id)
              .single();

            // Get last message
            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("message, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            allConversations.push({
              id: `conv_${conv.id}`,
              type: 'direct',
              conversationId: conv.id,
              partnerName: ownerProfile?.full_name || "Pet Owner",
              subject: "Direct Message",
              lastMessage: lastMsg?.message || null,
              lastMessageTime: lastMsg?.created_at || null,
            });
          }
        }
      }

      // Sort by last message time
      allConversations.sort((a, b) => {
        if (!a.lastMessageTime) return 1;
        if (!b.lastMessageTime) return -1;
        return new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime();
      });

      setConversations(allConversations);
    } catch (error: any) {
      console.error("Error fetching conversations:", error);
      toast.error("Failed to load conversations");
    } finally {
      setLoading(false);
    }
  };

  const handleConversationClick = (conv: ConversationItem) => {
    if (conv.type === 'booking') {
      navigate(`/chat/booking/${conv.bookingId}`);
    } else {
      navigate(`/chat/conversation/${conv.conversationId}`);
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

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-6 w-6" />
              My Chats
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            {conversations.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No conversations yet. Start chatting with pet owners or sitters!
              </p>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleConversationClick(conv)}
                    className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{conv.partnerName}</h3>
                        <p className="text-sm text-muted-foreground">{conv.subject}</p>
                        {conv.lastMessage && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                            {conv.lastMessage}
                          </p>
                        )}
                      </div>
                      {conv.lastMessageTime && (
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.lastMessageTime).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MyChats;
