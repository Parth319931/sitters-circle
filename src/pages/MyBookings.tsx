import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Star, MessageSquare, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const MyBookings = () => {
  const { toast } = useToast();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchBookings();
    }
  }, [user]);

  const fetchBookings = async () => {
    const { data: bookingsData, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        *,
        pets (name, type, breed)
      `)
      .eq("owner_id", user?.id)
      .order("start_time", { ascending: false });

    if (bookingsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings",
      });
      return;
    }

    // Load sitter profiles separately
    const sitterIds = Array.from(new Set((bookingsData || []).map((b: any) => b.sitter_id).filter(Boolean)));

    if (sitterIds.length > 0) {
      const { data: sitters, error: sittersError } = await supabase
        .from("sitters")
        .select("id, user_id")
        .in("id", sitterIds as string[]);

      if (!sittersError && sitters) {
        const userIds = sitters.map(s => s.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        if (!profilesError && profiles) {
          const sitterMap: Record<string, any> = {};
          sitters.forEach(s => {
            const profile = profiles.find(p => p.id === s.user_id);
            if (profile) {
              sitterMap[s.id] = profile;
            }
          });

          const enriched = (bookingsData || []).map((b: any) => ({
            ...b,
            sitter_profile: sitterMap[b.sitter_id] || null,
          }));
          setBookings(enriched);
          return;
        }
      }
    }

    setBookings(bookingsData || []);
  };

  const handleSubmitReview = async (bookingId: string) => {
    if (!rating) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please select a rating",
      });
      return;
    }

    const booking = bookings.find(b => b.id === bookingId);
    const { data: sitterData } = await supabase
      .from("sitters")
      .select("user_id")
      .eq("id", booking.sitter_id)
      .single();

    const { error } = await supabase.from("reviews").insert({
      booking_id: bookingId,
      reviewer_id: user?.id,
      reviewee_id: sitterData?.user_id,
      rating,
      comment: review || null,
    });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit review",
      });
      return;
    }

    toast({
      title: "Review Submitted!",
      description: "Thank you for your feedback.",
    });
    setRating(0);
    setReview("");
    fetchBookings();
  };

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter((b) => b.status === "upcoming");
  const activeBookings = bookings.filter((b) => b.status === "active");
  const completedBookings = bookings.filter((b) => b.status === "completed");

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
        <h1 className="text-4xl font-bold text-foreground mb-8">My Bookings</h1>
        
        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            {pendingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No pending bookings</p>
                </CardContent>
              </Card>
            ) : (
              pendingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{booking.sitter_profile?.full_name}</h3>
                        <div className="space-y-1 text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.start_time).toLocaleString()}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {booking.duration_hours} hours
                          </p>
                          <p>Pet: <span className="font-semibold text-foreground">{booking.pets?.name}</span></p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="secondary">Pending Approval</Badge>
                        <span className="text-2xl font-bold text-primary">${booking.total_cost}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4">
            {upcomingBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No upcoming bookings</p>
                </CardContent>
              </Card>
            ) : (
              upcomingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{booking.sitter_profile?.full_name}</h3>
                        <div className="space-y-1 text-muted-foreground">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {new Date(booking.start_time).toLocaleString()}
                          </p>
                          <p className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            {booking.duration_hours} hours
                          </p>
                          <p>Pet: <span className="font-semibold text-foreground">{booking.pets?.name}</span></p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge variant="default">Approved</Badge>
                        <span className="text-2xl font-bold text-primary">${booking.total_cost}</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>View OTP</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Your Walk OTP</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <div className="text-4xl font-bold text-center py-6 bg-secondary rounded-lg">
                                  {booking.otp}
                                </div>
                                <p className="text-sm text-muted-foreground mt-4 text-center">
                                  Share this code with your sitter to start the walk
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="active" className="space-y-4">
            {activeBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No active sessions</p>
                </CardContent>
              </Card>
            ) : (
              activeBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{booking.sitter_profile?.full_name}</h3>
                        <p className="text-muted-foreground">Pet: {booking.pets?.name}</p>
                        <Badge className="mt-2" variant="default">In Progress</Badge>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button asChild>
                          <Link to={`/chat/booking/${booking.id}`}>
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Chat with Sitter
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-4">
            {completedBookings.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No completed sessions</p>
                </CardContent>
              </Card>
            ) : (
              completedBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold mb-2">{booking.sitter_profile?.full_name}</h3>
                        <div className="space-y-1 text-muted-foreground">
                          <p>{new Date(booking.start_time).toLocaleDateString()}</p>
                          <p>Pet: {booking.pets?.name}</p>
                          <p>Duration: {booking.duration_hours} hours</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-xl font-bold">${booking.total_cost}</span>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button>
                              <Star className="h-4 w-4 mr-2" />
                              Leave Review
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Leave a Review</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <div className="flex gap-1 mt-2 justify-center">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-8 w-8 cursor-pointer ${
                                        star <= rating ? "fill-primary text-primary" : "text-muted-foreground"
                                      }`}
                                      onClick={() => setRating(star)}
                                    />
                                  ))}
                                </div>
                              </div>
                              
                              <div>
                                <Textarea
                                  placeholder="Share your experience..."
                                  value={review}
                                  onChange={(e) => setReview(e.target.value)}
                                  rows={4}
                                />
                              </div>
                              
                              <Button onClick={() => handleSubmitReview(booking.id)} className="w-full">
                                Submit Review
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default MyBookings;
