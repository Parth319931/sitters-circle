import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dog, MapPin, Shield, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="flex justify-center mb-6">
            <Dog className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 text-foreground">
            PetCare Connect
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Find trusted pet sitters in your area. Give your furry friends the care they deserve.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/sitters">
              <Button size="lg" className="text-lg px-8">
                Find a Sitter
              </Button>
            </Link>
          {!user && (
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Sign In
              </Button>
            </Link>
          )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Why Choose PetCare Connect?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <Shield className="h-12 w-12 text-secondary" />
                </div>
                <CardTitle>Verified Sitters</CardTitle>
                <CardDescription>
                  All sitters are background-checked and reviewed by pet owners
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <MapPin className="h-12 w-12 text-accent" />
                </div>
                <CardTitle>Local & Available</CardTitle>
                <CardDescription>
                  Find sitters near you with real-time availability
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="flex justify-center mb-4">
                  <Heart className="h-12 w-12 text-primary" />
                </div>
                <CardTitle>Peace of Mind</CardTitle>
                <CardDescription>
                  Track walks in real-time and stay connected via chat
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            How It Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold mb-2">Search</h3>
              <p className="text-muted-foreground text-sm">
                Browse sitters by location, rating, and availability
              </p>
            </div>

            <div className="text-center">
              <div className="bg-secondary text-secondary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold mb-2">Book</h3>
              <p className="text-muted-foreground text-sm">
                Select a sitter and schedule your service
              </p>
            </div>

            <div className="text-center">
              <div className="bg-accent text-accent-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold mb-2">Connect</h3>
              <p className="text-muted-foreground text-sm">
                Share OTP to start the session and chat in real-time
              </p>
            </div>

            <div className="text-center">
              <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="font-semibold mb-2">Review</h3>
              <p className="text-muted-foreground text-sm">
                Rate your experience and help the community
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of pet owners who trust PetCare Connect for their pet care needs.
          </p>
          {user ? (
            <Link to="/sitters">
              <Button size="lg" className="text-lg px-8">
                Find a Sitter
              </Button>
            </Link>
          ) : (
            <Link to="/auth">
              <Button size="lg" className="text-lg px-8">
                Sign Up Now
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
