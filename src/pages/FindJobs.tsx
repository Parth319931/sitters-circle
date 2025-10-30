import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, MapPin, Clock, DollarSign } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const FindJobs = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAvailableBookings();
    }
  }, [user]);

  const fetchAvailableBookings = async () => {
    // Fetch available bookings without profile join (no FK between bookings.owner_id and profiles.id)
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        pets (name, type, breed)
      `)
      .eq("status", "upcoming")
      .is("sitter_id", null)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load available jobs",
      });
      return;
    }

    // Load owner profiles separately and merge
    const ownerIds = Array.from(new Set((data || []).map((b: any) => b.owner_id).filter(Boolean)));

    if (ownerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, location, avatar_url")
        .in("id", ownerIds as string[]);

      if (!profilesError && profiles) {
        const profileMap: Record<string, any> = Object.fromEntries(
          profiles.map((p: any) => [p.id, p])
        );
        const enriched = (data || []).map((b: any) => ({
          ...b,
          profiles: profileMap[b.owner_id] || null,
        }));
        setBookings(enriched);
        return;
      }
    }

    setBookings(data || []);
  };

  const handleApplyJob = async (bookingId: string) => {
    // Get sitter profile
    const { data: sitterData, error: sitterError } = await supabase
      .from("sitters")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (sitterError || !sitterData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to set up your sitter profile first",
      });
      navigate("/profile");
      return;
    }

    // Update booking with sitter
    const { error } = await supabase
      .from("bookings")
      .update({ sitter_id: sitterData.id })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to apply for job",
      });
      return;
    }

    toast({
      title: "Success!",
      description: "You've successfully applied for this job",
    });

    fetchAvailableBookings();
  };

  const filteredBookings = bookings.filter((booking) => {
    const query = searchQuery.toLowerCase();
    return (
      booking.pets?.name.toLowerCase().includes(query) ||
      booking.pets?.type.toLowerCase().includes(query) ||
      booking.profiles?.location?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">Find Pet Sitting Jobs</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by pet name, type, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No available jobs found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => (
              <Card key={booking.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={booking.profiles?.avatar_url} />
                        <AvatarFallback>
                          {booking.profiles?.full_name?.charAt(0) || "O"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{booking.pets?.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{booking.profiles?.full_name}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Badge variant="secondary">{booking.pets?.type}</Badge>
                      {booking.pets?.breed && (
                        <span className="text-sm text-muted-foreground ml-2">
                          {booking.pets?.breed}
                        </span>
                      )}
                    </div>

                    {booking.profiles?.location && (
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.profiles.location}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(booking.start_time).toLocaleString()} ({booking.duration_hours}h)
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <DollarSign className="h-4 w-4 text-primary" />
                      <span>${booking.total_cost}</span>
                    </div>

                    {booking.notes && (
                      <div className="pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground">{booking.notes}</p>
                      </div>
                    )}

                    <Button 
                      className="w-full mt-4"
                      onClick={() => handleApplyJob(booking.id)}
                    >
                      Apply for Job
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FindJobs;
