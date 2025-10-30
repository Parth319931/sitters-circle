import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [sitterProfile, setSitterProfile] = useState<any>(null);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    location: "",
  });
  const [sitterFormData, setSitterFormData] = useState({
    hourly_rate: "",
    bio: "",
    experience_years: "",
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchRoles();
      fetchSitterProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .maybeSingle();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile",
      });
      return;
    }
    
    if (!data) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Profile not found",
      });
      return;
    }

    setProfile(data);
    setFormData({
      full_name: data.full_name || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
    });
  };

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id);

    if (error) return;
    setRoles(data.map((r) => r.role));
  };

  const fetchSitterProfile = async () => {
    const { data, error } = await supabase
      .from("sitters")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (data) {
      setSitterProfile(data);
      setSitterFormData({
        hourly_rate: data.hourly_rate?.toString() || "",
        bio: data.bio || "",
        experience_years: data.experience_years?.toString() || "",
      });
    }
  };

  const handleSave = async () => {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        location: formData.location,
      })
      .eq("id", user?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
    fetchProfile();
  };

  const handleSaveSitterProfile = async () => {
    const { error } = await supabase
      .from("sitters")
      .update({
        hourly_rate: parseFloat(sitterFormData.hourly_rate),
        bio: sitterFormData.bio,
        experience_years: parseInt(sitterFormData.experience_years),
      })
      .eq("user_id", user?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update sitter profile",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Sitter profile updated successfully",
    });
    fetchSitterProfile();
  };

  if (loading || !profile) {
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
      
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <h1 className="text-4xl font-bold text-foreground mb-8">My Profile</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6 mb-6">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={profile.avatar_url} />
                  <AvatarFallback>{formData.full_name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-semibold">{formData.full_name}</h2>
                  <div className="flex gap-2 mt-2">
                    {roles.includes("owner") && <Badge>Pet Owner</Badge>}
                    {roles.includes("sitter") && <Badge variant="secondary">Pet Sitter</Badge>}
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.full_name}
                    onChange={(e) =>
                      setFormData({ ...formData, full_name: e.target.value })
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    disabled
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>
                
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
                
                <Button onClick={handleSave}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>

          {roles.includes("sitter") && sitterProfile && (
            <Card>
              <CardHeader>
                <CardTitle>Sitter Profile</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      step="0.01"
                      value={sitterFormData.hourly_rate}
                      onChange={(e) =>
                        setSitterFormData({ ...sitterFormData, hourly_rate: e.target.value })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="experience">Experience (years)</Label>
                    <Input
                      id="experience"
                      type="number"
                      value={sitterFormData.experience_years}
                      onChange={(e) =>
                        setSitterFormData({ ...sitterFormData, experience_years: e.target.value })
                      }
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell pet owners about your experience..."
                      value={sitterFormData.bio}
                      onChange={(e) =>
                        setSitterFormData({ ...sitterFormData, bio: e.target.value })
                      }
                      rows={4}
                    />
                  </div>
                  
                  <Button onClick={handleSaveSitterProfile}>Save Sitter Profile</Button>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button variant="outline" className="w-full justify-start">
                Change Password
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Notification Preferences
              </Button>
              <Button variant="outline" className="w-full justify-start">
                Payment Methods
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
