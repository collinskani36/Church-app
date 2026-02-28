import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Readings from "./pages/Readings";
import Hymns from "./pages/Hymns";
import Prayers from "./pages/Prayers";
import Parish from "./pages/Parish";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import Announcements from "./pages/Announcements";
import Bible from "./pages/Bible";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/readings" element={<Readings />} />
              <Route path="/hymns" element={<Hymns />} />
              <Route path="/prayers" element={<Prayers />} />
              <Route path="/parish" element={<Parish />} />
              <Route path="/announcements" element={<Announcements />} />
              <Route path="/bible" element={<Bible />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
