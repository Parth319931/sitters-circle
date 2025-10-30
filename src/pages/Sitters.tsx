import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Sitters = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  const { data: sittersData, isLoading } = useQuery({
    queryKey: ["sitters"],
    queryFn: async () => {
      const { data: sitters, error } = await supabase
        .from("sitters")
        .select("*");

      if (error) throw error;
      
      // Fetch profiles for each sitter
      const sittersWithProfiles = await Promise.all(
        sitters.map(async (sitter) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", sitter.user_id)
            .single();
          
          return { ...sitter, profile };
        })
      );
      
      return sittersWithProfiles;
    },
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const filteredSitters = (sittersData || []).filter(sitter => {
    const matchesSearch = sitter.profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLocation = locationFilter === "all" || sitter.profile?.location === locationFilter;
    const matchesRating = ratingFilter === "all" || sitter.rating >= parseFloat(ratingFilter);
    return matchesSearch && matchesLocation && matchesRating;
  });

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Find Pet Sitters</h1>
        
        <div className="bg-card rounded-lg border border-border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="Downtown">Downtown</SelectItem>
                <SelectItem value="Westside">Westside</SelectItem>
                <SelectItem value="East End">East End</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="4.5">4.5+ Stars</SelectItem>
                <SelectItem value="4.0">4.0+ Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {filteredSitters.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sitters found. Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSitters.map((sitter) => (
              <Card key={sitter.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <img
                      src={sitter.profile?.avatar_url || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400"}
                      alt={sitter.profile?.full_name || "Sitter"}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-lg">{sitter.profile?.full_name || "Unknown"}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-4 w-4" />
                        {sitter.profile?.location || "Unknown"}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-primary text-primary" />
                        <span className="font-semibold">{sitter.rating?.toFixed(1) || "0.0"}</span>
                        <span className="text-sm text-muted-foreground">({sitter.review_count || 0} reviews)</span>
                      </div>
                      <span className="font-bold text-primary">${sitter.hourly_rate}/hr</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link to={`/chat/sitter/${sitter.id}`}>
                          <MessageCircle className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button asChild className="flex-1">
                        <Link to={`/sitter/${sitter.id}`}>View Profile</Link>
                      </Button>
                      <Button 
                        variant="secondary" 
                        className="flex-1"
                        asChild
                        disabled={!sitter.available}
                      >
                        <Link to={`/booking/${sitter.id}`}>
                          {sitter.available ? "Book Now" : "Unavailable"}
                        </Link>
                      </Button>
                    </div>
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

export default Sitters;
