import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Sitters from "./pages/Sitters";
import SitterProfile from "./pages/SitterProfile";
import Booking from "./pages/Booking";
import MyBookings from "./pages/MyBookings";
import SitterBookings from "./pages/SitterBookings";
import Pets from "./pages/Pets";
import Chat from "./pages/Chat";
import MyChats from "./pages/MyChats";
import Profile from "./pages/Profile";
import FindJobs from "./pages/FindJobs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  console.log("App component rendering");
  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/sitters" element={<Sitters />} />
          <Route path="/sitter/:id" element={<SitterProfile />} />
          <Route path="/booking/:sitterId" element={<Booking />} />
          <Route path="/my-bookings" element={<MyBookings />} />
          <Route path="/sitter-bookings" element={<SitterBookings />} />
          <Route path="/pets" element={<Pets />} />
          <Route path="/chat/booking/:bookingId" element={<Chat />} />
          <Route path="/chat/sitter/:sitterId" element={<Chat />} />
          <Route path="/chat/conversation/:conversationId" element={<Chat />} />
          <Route path="/my-chats" element={<MyChats />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/find-jobs" element={<FindJobs />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
