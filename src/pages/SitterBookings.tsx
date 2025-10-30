import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Clock, MapPin, Star, MessageSquare } from "lucide-react";

const SitterBookings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [otpInput, setOtpInput] = useState<{ [key: string]: string }>({});
  const [bookingReviews, setBookingReviews] = useState<{ [key: string]: any }>({});

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
    // First get the sitter ID for this user
    const { data: sitterData, error: sitterError } = await supabase
      .from("sitters")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (sitterError || !sitterData) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You need to set up a sitter profile first",
      });
      return;
    }

    // Fetch bookings for this sitter (without profile join due to missing FK)
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        *,
        pets (name, type, breed)
      `)
      .eq("sitter_id", sitterData.id)
      .order("start_time", { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load bookings",
      });
      return;
    }

    // Fetch owner profiles separately and merge into results
    const ownerIds = Array.from(
      new Set((data || []).map((b: any) => b.owner_id).filter(Boolean))
    );

    if (ownerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .in("id", ownerIds as string[]);

      if (profilesError) {
        // Fall back to bookings without owner profile details
        setBookings(data || []);
        return;
      }

      const profileMap: Record<string, any> = Object.fromEntries(
        (profiles || []).map((p: any) => [p.id, p])
      );

      const enriched = (data || []).map((b: any) => ({
        ...b,
        profiles: profileMap[b.owner_id] || null,
      }));

      // Fetch reviews for completed bookings
      const completedBookingIds = enriched
        .filter((b: any) => b.status === "completed")
        .map((b: any) => b.id);

      if (completedBookingIds.length > 0) {
        const { data: reviewsData } = await supabase
          .from("reviews")
          .select("*")
          .in("booking_id", completedBookingIds);

        if (reviewsData && reviewsData.length > 0) {
          // Fetch reviewer profiles
          const reviewerIds = reviewsData.map((r: any) => r.reviewer_id);
          const { data: reviewerProfiles } = await supabase
            .from("profiles")
            .select("id, full_name")
            .in("id", reviewerIds);

          const profileMap: Record<string, any> = Object.fromEntries(
            (reviewerProfiles || []).map((p: any) => [p.id, p])
          );

          const reviewsMap: { [key: string]: any } = {};
          reviewsData.forEach((review: any) => {
            reviewsMap[review.booking_id] = {
              ...review,
              profiles: profileMap[review.reviewer_id] || null,
            };
          });
          setBookingReviews(reviewsMap);
        }
      }

      setBookings(enriched);
      return;
    }

    setBookings(data || []);
  };

  const handleApproveBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "upcoming" })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve booking",
      });
      return;
    }

    toast({
      title: "Booking Approved!",
      description: "The owner has been notified",
    });
    fetchBookings();
  };

  const handleDenyBooking = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to deny booking",
      });
      return;
    }

    toast({
      title: "Booking Denied",
      description: "The owner has been notified",
    });
    fetchBookings();
  };

  const handleStartWalk = async (bookingId: string) => {
    const otp = otpInput[bookingId];
    if (!otp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter the OTP",
      });
      return;
    }

    // Verify OTP
    const booking = bookings.find((b) => b.id === bookingId);
    if (booking?.otp !== otp) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid OTP",
      });
      return;
    }

    // Update booking status
    const { error } = await supabase
      .from("bookings")
      .update({ status: "active" })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start walk",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Walk started successfully",
    });
    fetchBookings();
  };

  const handleEndWalk = async (bookingId: string) => {
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to end walk",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Walk completed successfully",
    });
    fetchBookings();
  };

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

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const upcomingBookings = bookings.filter((b) => b.status === "upcoming");
  const activeBookings = bookings.filter((b) => b.status === "active");
  const completedBookings = bookings.filter((b) => b.status === "completed");

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">My Bookings</h1>

        <div className="space-y-8">
          {/* Pending Bookings */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Pending Requests</h2>
            <div className="grid gap-4">
              {pendingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{booking.pets?.name}</span>
                      <Badge variant="secondary">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Owner</p>
                        <p className="font-medium">{booking.profiles?.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{booking.profiles?.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Type</p>
                        <p className="font-medium">{booking.pets?.type} - {booking.pets?.breed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{booking.duration_hours} hours</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="font-medium text-primary">${booking.total_cost}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(booking.start_time).toLocaleDateString()}
                      <Clock className="h-4 w-4 ml-2" />
                      {new Date(booking.start_time).toLocaleTimeString()}
                    </div>
                    {booking.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Special Instructions</p>
                        <p className="text-sm">{booking.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button onClick={() => handleApproveBooking(booking.id)} className="flex-1">
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        onClick={() => handleDenyBooking(booking.id)}
                        className="flex-1"
                      >
                        Deny
                      </Button>
                    </div>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to={`/chat/booking/${booking.id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat with Owner
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {pendingBookings.length === 0 && (
                <p className="text-muted-foreground">No pending requests</p>
              )}
            </div>
          </div>

          {/* Approved Bookings */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Approved Walks</h2>
            <div className="grid gap-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{booking.pets?.name}</span>
                      <Badge>Upcoming</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Owner</p>
                        <p className="font-medium">{booking.profiles?.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Contact</p>
                        <p className="font-medium">{booking.profiles?.phone || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Type</p>
                        <p className="font-medium">{booking.pets?.type} - {booking.pets?.breed}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{booking.duration_hours} hours</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4" />
                      {new Date(booking.start_time).toLocaleDateString()}
                      <Clock className="h-4 w-4 ml-2" />
                      {new Date(booking.start_time).toLocaleTimeString()}
                    </div>
                    {booking.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Special Instructions</p>
                        <p className="text-sm">{booking.notes}</p>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor={`otp-${booking.id}`}>Enter OTP to Start Walk</Label>
                      <div className="flex gap-2">
                        <Input
                          id={`otp-${booking.id}`}
                          placeholder="Enter OTP"
                          value={otpInput[booking.id] || ""}
                          onChange={(e) =>
                            setOtpInput({ ...otpInput, [booking.id]: e.target.value })
                          }
                        />
                        <Button onClick={() => handleStartWalk(booking.id)}>
                          Start Walk
                        </Button>
                      </div>
                    </div>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to={`/chat/booking/${booking.id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat with Owner
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {upcomingBookings.length === 0 && (
                <p className="text-muted-foreground">No upcoming bookings</p>
              )}
            </div>
          </div>

          {/* Active Bookings */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Active Walks</h2>
            <div className="grid gap-4">
              {activeBookings.map((booking) => (
                <Card key={booking.id} className="border-primary">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{booking.pets?.name}</span>
                      <Badge variant="default">Active</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Owner</p>
                        <p className="font-medium">{booking.profiles?.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="font-medium">{booking.duration_hours} hours</p>
                      </div>
                    </div>
                    <Button onClick={() => handleEndWalk(booking.id)} className="w-full">
                      End Walk
                    </Button>
                    <Button asChild variant="secondary" className="w-full">
                      <Link to={`/chat/booking/${booking.id}`}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Chat with Owner
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
              {activeBookings.length === 0 && (
                <p className="text-muted-foreground">No active walks</p>
              )}
            </div>
          </div>

          {/* Completed Bookings */}
          <div>
            <h2 className="text-2xl font-semibold mb-4">Completed Bookings</h2>
            <div className="grid gap-4">
              {completedBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <span>{booking.pets?.name}</span>
                      <Badge variant="secondary">Completed</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Pet Owner</p>
                        <p className="font-medium">{booking.profiles?.full_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {new Date(booking.start_time).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {bookingReviews[booking.id] && (
                      <div className="mt-4 p-4 bg-secondary/50 rounded-lg">
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          Review from {bookingReviews[booking.id].profiles?.full_name}
                          <div className="flex ml-2">
                            {[...Array(bookingReviews[booking.id].rating)].map((_: any, i: number) => (
                              <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                            ))}
                          </div>
                        </h4>
                        {bookingReviews[booking.id].comment && (
                          <p className="text-sm text-muted-foreground">
                            "{bookingReviews[booking.id].comment}"
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {completedBookings.length === 0 && (
                <p className="text-muted-foreground">No completed bookings</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SitterBookings;
