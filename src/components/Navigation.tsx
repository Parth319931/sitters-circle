import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home, Search, Calendar, PawPrint, User, LogOut, Briefcase, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (user) {
      fetchUserRole();
    }
  }, [user]);

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
  
  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };
  
  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <PawPrint className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">PetCare Connect</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button
                variant={isActive("/") ? "default" : "ghost"}
                size="sm"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
            </Link>
            
            {user && (
              <>
                {userRole === "sitter" ? (
                  <>
                    <Link to="/find-jobs">
                      <Button
                        variant={isActive("/find-jobs") ? "default" : "ghost"}
                        size="sm"
                      >
                        <Briefcase className="h-4 w-4 mr-2" />
                        Find Jobs
                      </Button>
                    </Link>
                    
                    <Link to="/sitter-bookings">
                      <Button
                        variant={isActive("/sitter-bookings") ? "default" : "ghost"}
                        size="sm"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        My Bookings
                      </Button>
                    </Link>
                    
                    <Link to="/my-chats">
                      <Button
                        variant={isActive("/my-chats") ? "default" : "ghost"}
                        size="sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        My Chats
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/sitters">
                      <Button
                        variant={isActive("/sitters") ? "default" : "ghost"}
                        size="sm"
                      >
                        <Search className="h-4 w-4 mr-2" />
                        Find Sitters
                      </Button>
                    </Link>
                    
                    <Link to="/my-bookings">
                      <Button
                        variant={isActive("/my-bookings") ? "default" : "ghost"}
                        size="sm"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Bookings
                      </Button>
                    </Link>
                    
                    <Link to="/pets">
                      <Button
                        variant={isActive("/pets") ? "default" : "ghost"}
                        size="sm"
                      >
                        <PawPrint className="h-4 w-4 mr-2" />
                        My Pets
                      </Button>
                    </Link>
                    
                    <Link to="/my-chats">
                      <Button
                        variant={isActive("/my-chats") ? "default" : "ghost"}
                        size="sm"
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        My Chats
                      </Button>
                    </Link>
                  </>
                )}
                
                <Link to="/profile">
                  <Button
                    variant={isActive("/profile") ? "default" : "ghost"}
                    size="sm"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </Button>
                </Link>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            )}
            
            {!user && (
              <Link to="/auth">
                <Button size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
