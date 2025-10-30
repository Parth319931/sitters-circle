import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, AlertCircle, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Pets = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [pets, setPets] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingPet, setEditingPet] = useState<any>(null);
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");
  const [lastVaccination, setLastVaccination] = useState("");
  const [vaccinationInterval, setVaccinationInterval] = useState("");

  useEffect(() => {
    if (user) {
      fetchPets();
    }
  }, [user]);

  const fetchPets = async () => {
    const { data, error } = await supabase
      .from("pets")
      .select("*")
      .eq("owner_id", user?.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load pets",
      });
      return;
    }

    setPets(data || []);
  };

  const calculateNextVaccination = (lastDate: string, intervalDays: number) => {
    if (!lastDate || !intervalDays) return null;
    const last = new Date(lastDate);
    const next = new Date(last);
    next.setDate(next.getDate() + intervalDays);
    return next.toISOString().split('T')[0];
  };

  const calculateDaysUntil = (date: string) => {
    if (!date) return null;
    const today = new Date();
    const target = new Date(date);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const resetForm = () => {
    setPetName("");
    setPetType("");
    setBreed("");
    setAge("");
    setLastVaccination("");
    setVaccinationInterval("");
    setEditingPet(null);
  };

  const handleAddPet = async () => {
    const vaccinationDueDate = calculateNextVaccination(lastVaccination, parseInt(vaccinationInterval));

    const { data, error } = await supabase.from("pets").insert({
      owner_id: user?.id,
      name: petName,
      type: petType,
      breed: breed || null,
      age: age ? parseInt(age) : null,
      last_vaccination_date: lastVaccination || null,
      vaccination_interval_days: vaccinationInterval ? parseInt(vaccinationInterval) : null,
      vaccination_due_date: vaccinationDueDate,
    }).select();

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add pet",
      });
      return;
    }

    // Check if vaccination is due within 2 days and send immediate reminder
    if (vaccinationDueDate && data && data[0]) {
      const daysUntil = calculateDaysUntil(vaccinationDueDate);
      console.log('[Pets.tsx] Vaccination due date:', vaccinationDueDate, 'Days until:', daysUntil);
      
      if (daysUntil !== null && daysUntil <= 2) {
        console.log('[Pets.tsx] Sending immediate WhatsApp reminder for pet:', data[0].id);
        try {
          const response = await supabase.functions.invoke('vaccination-reminder', {
            body: { pet_id: data[0].id }
          });
          console.log('[Pets.tsx] WhatsApp reminder response:', response);
          
          if (response.error) {
            console.error('[Pets.tsx] Error from edge function:', response.error);
          } else {
            console.log('[Pets.tsx] WhatsApp reminder sent successfully:', response.data);
          }
        } catch (error) {
          console.error('[Pets.tsx] Exception sending immediate reminder:', error);
        }
      } else {
        console.log('[Pets.tsx] No immediate reminder needed. Days until vaccination:', daysUntil);
      }
    } else {
      console.log('[Pets.tsx] Skipping reminder - vaccinationDueDate:', vaccinationDueDate, 'data:', data);
    }

    toast({
      title: "Pet Added!",
      description: `${petName} has been added to your profile.`,
    });

    resetForm();
    setIsAddDialogOpen(false);
    fetchPets();
  };

  const handleEditPet = async () => {
    const vaccinationDueDate = calculateNextVaccination(lastVaccination, parseInt(vaccinationInterval));

    const { error } = await supabase
      .from("pets")
      .update({
        name: petName,
        type: petType,
        breed: breed || null,
        age: age ? parseInt(age) : null,
        last_vaccination_date: lastVaccination || null,
        vaccination_interval_days: vaccinationInterval ? parseInt(vaccinationInterval) : null,
        vaccination_due_date: vaccinationDueDate,
      })
      .eq("id", editingPet.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update pet",
      });
      return;
    }

    // Check if vaccination is due within 2 days and send immediate reminder
    if (vaccinationDueDate) {
      const daysUntil = calculateDaysUntil(vaccinationDueDate);
      console.log('[Pets.tsx] Edit - Vaccination due date:', vaccinationDueDate, 'Days until:', daysUntil);
      
      if (daysUntil !== null && daysUntil <= 2) {
        console.log('[Pets.tsx] Edit - Sending immediate WhatsApp reminder for pet:', editingPet.id);
        try {
          const response = await supabase.functions.invoke('vaccination-reminder', {
            body: { pet_id: editingPet.id }
          });
          console.log('[Pets.tsx] Edit - WhatsApp reminder response:', response);
          
          if (response.error) {
            console.error('[Pets.tsx] Edit - Error from edge function:', response.error);
          } else {
            console.log('[Pets.tsx] Edit - WhatsApp reminder sent successfully:', response.data);
          }
        } catch (error) {
          console.error('[Pets.tsx] Edit - Exception sending immediate reminder:', error);
        }
      } else {
        console.log('[Pets.tsx] Edit - No immediate reminder needed. Days until vaccination:', daysUntil);
      }
    } else {
      console.log('[Pets.tsx] Edit - No vaccination due date set');
    }

    toast({
      title: "Pet Updated!",
      description: `${petName} has been updated.`,
    });

    resetForm();
    setEditingPet(null);
    fetchPets();
  };

  const openEditDialog = (pet: any) => {
    setEditingPet(pet);
    setPetName(pet.name);
    setPetType(pet.type);
    setBreed(pet.breed || "");
    setAge(pet.age?.toString() || "");
    setLastVaccination(pet.last_vaccination_date || "");
    setVaccinationInterval(pet.vaccination_interval_days?.toString() || "");
  };

  const getVaccinationBadge = (days: number) => {
    if (days <= 2) {
      return <Badge variant="destructive">Due Soon!</Badge>;
    } else if (days <= 14) {
      return <Badge className="bg-yellow-500">Upcoming</Badge>;
    } else {
      return <Badge variant="secondary">Up to Date</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-foreground">My Pets</h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { resetForm(); setIsAddDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Pet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Pet</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="petName">Pet Name</Label>
                  <Input
                    id="petName"
                    placeholder="Enter pet name"
                    value={petName}
                    onChange={(e) => setPetName(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="petType">Pet Type</Label>
                  <Select value={petType} onValueChange={setPetType}>
                    <SelectTrigger id="petType">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dog">Dog</SelectItem>
                      <SelectItem value="Cat">Cat</SelectItem>
                      <SelectItem value="Bird">Bird</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="breed">Breed</Label>
                  <Input
                    id="breed"
                    placeholder="Enter breed"
                    value={breed}
                    onChange={(e) => setBreed(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="age">Age (years)</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter age"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastVaccination">Last Vaccination Date</Label>
                  <Input
                    id="lastVaccination"
                    type="date"
                    value={lastVaccination}
                    onChange={(e) => setLastVaccination(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="interval">Vaccination Interval (days)</Label>
                  <Input
                    id="interval"
                    type="number"
                    placeholder="e.g., 180"
                    value={vaccinationInterval}
                    onChange={(e) => setVaccinationInterval(e.target.value)}
                  />
                </div>
                
                <Button onClick={handleAddPet} className="w-full">
                  Add Pet
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <Dialog open={!!editingPet} onOpenChange={(open) => !open && resetForm()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Pet Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="editPetName">Pet Name</Label>
                <Input
                  id="editPetName"
                  placeholder="Enter pet name"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="editPetType">Pet Type</Label>
                <Select value={petType} onValueChange={setPetType}>
                  <SelectTrigger id="editPetType">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Dog">Dog</SelectItem>
                    <SelectItem value="Cat">Cat</SelectItem>
                    <SelectItem value="Bird">Bird</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="editBreed">Breed</Label>
                <Input
                  id="editBreed"
                  placeholder="Enter breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="editAge">Age (years)</Label>
                <Input
                  id="editAge"
                  type="number"
                  placeholder="Enter age"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="editLastVaccination">Last Vaccination Date</Label>
                <Input
                  id="editLastVaccination"
                  type="date"
                  value={lastVaccination}
                  onChange={(e) => setLastVaccination(e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="editInterval">Vaccination Interval (days)</Label>
                <Input
                  id="editInterval"
                  type="number"
                  placeholder="e.g., 180"
                  value={vaccinationInterval}
                  onChange={(e) => setVaccinationInterval(e.target.value)}
                />
              </div>
              
              <Button onClick={handleEditPet} className="w-full">
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pets.map((pet) => {
            const daysUntil = pet.vaccination_due_date ? calculateDaysUntil(pet.vaccination_due_date) : null;
            
            return (
              <Card key={pet.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-xl">{pet.name}</CardTitle>
                    {daysUntil !== null && getVaccinationBadge(daysUntil)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <p className="font-semibold">{pet.type}</p>
                    </div>
                    
                    {pet.breed && (
                      <div>
                        <p className="text-sm text-muted-foreground">Breed</p>
                        <p className="font-semibold">{pet.breed}</p>
                      </div>
                    )}
                    
                    {pet.age && (
                      <div>
                        <p className="text-sm text-muted-foreground">Age</p>
                        <p className="font-semibold">{pet.age} years</p>
                      </div>
                    )}
                    
                    {pet.last_vaccination_date && (
                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span className="font-semibold">Vaccination</span>
                        </div>
                        
                        <div className="space-y-1 text-sm">
                          <p className="text-muted-foreground">
                            Last: {pet.last_vaccination_date}
                          </p>
                          {pet.vaccination_due_date && (
                            <p className="text-muted-foreground">
                              Next: {pet.vaccination_due_date}
                            </p>
                          )}
                          
                          {daysUntil !== null && daysUntil <= 14 && (
                            <div className="flex items-start gap-2 mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
                              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                              <p className="text-yellow-600 dark:text-yellow-400 text-xs">
                                Vaccination due in {daysUntil} days
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => openEditDialog(pet)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Pets;
