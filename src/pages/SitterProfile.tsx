import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, MapPin, Clock, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

const SitterProfile = () => {
  const { id } = useParams();
  const [sitter, setSitter] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSitterData = async () => {
      try {
        // Fetch sitter data
        const { data: sitterData, error: sitterError } = await supabase
          .from("sitters")
          .select("*")
          .eq("id", id)
          .single();

        if (sitterError) throw sitterError;

        // Fetch profile separately
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", sitterData.user_id)
          .single();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }

        // Fetch reviews for this sitter
        const { data: reviewsData, error: reviewsError } = await supabase
          .from("reviews")
          .select("*, reviewer_id")
          .eq("reviewee_id", sitterData.user_id)
          .order("created_at", { ascending: false });

        if (reviewsError) throw reviewsError;

        // Fetch reviewer profiles
        const reviewerIds = reviewsData?.map(r => r.reviewer_id) || [];
        const { data: reviewerProfiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", reviewerIds);

        const profileMap = Object.fromEntries(
          (reviewerProfiles || []).map(p => [p.id, p])
        );

        const enrichedReviews = (reviewsData || []).map(review => ({
          ...review,
          profiles: profileMap[review.reviewer_id]
        }));

        setSitter({ ...sitterData, profiles: profileData });
        setReviews(enrichedReviews);
      } catch (error) {
        console.error("Error fetching sitter data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchSitterData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!sitter) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Sitter not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-8">
              <img
                src={sitter.profiles?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"}
                alt={sitter.profiles?.full_name}
                className="w-48 h-48 rounded-lg object-cover"
              />
              
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-foreground mb-2">{sitter.profiles?.full_name}</h1>
                
                <div className="flex flex-wrap gap-4 mb-4 text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {sitter.profiles?.location || "Location not specified"}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {sitter.experience_years} years experience
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-primary text-primary" />
                    <span className="font-semibold text-foreground">{sitter.rating?.toFixed(1) || "New"}</span>
                    <span>({sitter.review_count || 0} reviews)</span>
                  </div>
                </div>
                
                <p className="text-muted-foreground mb-6">{sitter.bio}</p>
                
                <div className="flex gap-4 items-center mb-6">
                  <span className="text-3xl font-bold text-primary">${sitter.hourly_rate}/hr</span>
                  <Button size="lg" asChild>
                    <Link to={`/booking/${sitter.id}`}>Book Now</Link>
                  </Button>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Award className="h-5 w-5 text-primary" />
                    Services Offered
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {sitter.services && sitter.services.length > 0 ? (
                      sitter.services.map((service: string) => (
                        <span
                          key={service}
                          className="px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm"
                        >
                          {service}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground text-sm">No services listed yet</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Reviews ({reviews.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b border-border pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{review.profiles?.full_name || "Anonymous"}</span>
                        <div className="flex">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-muted-foreground">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No reviews yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SitterProfile;
