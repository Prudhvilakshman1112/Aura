import { useState, useEffect } from "react";
import { DashboardCard } from "./DashboardCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { 
  Activity, 
  User, 
  Scale, 
  Ruler,
  Calendar,
  Edit3,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { EditPhysicalDataDialog } from "./EditPhysicalDataDialog";

interface PhysicalData {
  height: number; // in cm
  weight: number; // in kg
  age: number;
  gender: 'male' | 'female' | 'other';
}

export const PhysicalMetrics = () => {
  const { toast } = useToast();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [physicalData, setPhysicalData] = useState<PhysicalData>({
    height: 175,
    weight: 70,
    age: 22,
    gender: 'male'
  });

  useEffect(() => {
    fetchPhysicalData();
    
    // Listen for profile updates to refresh physical metrics
    const handleProfileUpdate = (event: CustomEvent) => {
      const { physicalMetricsUpdated } = event.detail;
      
      if (physicalMetricsUpdated) {
        setTimeout(() => {
          fetchPhysicalData();
        }, 500); // Small delay to ensure backend has processed the updates
      }
    };

    window.addEventListener('profileUpdated', handleProfileUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate as EventListener);
    };
  }, []);

  const fetchPhysicalData = async () => {
    try {
      const response = await api.getPhysicalMetrics();
      console.log('🔍 Physical Metrics API Response:', response);
      
      if (response.status === 'success' && response.data) {
        console.log('📊 Physical Data from API:', response.data);
        
        setPhysicalData({
          height: response.data.height_cm || 175,
          weight: response.data.weight_kg || 70,
          age: response.data.age || 22,
          gender: (response.data.gender?.toLowerCase() as 'male' | 'female' | 'other') || 'male'
        });
        
        console.log('✅ Physical Data Set:', {
          height: response.data.height_cm || 175,
          weight: response.data.weight_kg || 70,
          age: response.data.age || 22,
          gender: (response.data.gender?.toLowerCase() as 'male' | 'female' | 'other') || 'male'
        });
      } else {
        console.log('❌ API Response not successful or no data');
      }
    } catch (error) {
      console.error('❌ Failed to fetch physical data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateBMI = (weight: number, height: number): number => {
    const heightInMeters = height / 100;
    return Number((weight / (heightInMeters * heightInMeters)).toFixed(1));
  };

  const getBMICategory = (bmi: number): { category: string; color: string; icon: JSX.Element } => {
    if (bmi < 18.5) {
      return { 
        category: "Underweight", 
        color: "text-blue-400", 
        icon: <TrendingDown className="w-4 h-4" />
      };
    } else if (bmi < 25) {
      return { 
        category: "Normal", 
        color: "text-green-400", 
        icon: <Minus className="w-4 h-4" />
      };
    } else if (bmi < 30) {
      return { 
        category: "Overweight", 
        color: "text-yellow-400", 
        icon: <TrendingUp className="w-4 h-4" />
      };
    } else {
      return { 
        category: "Obese", 
        color: "text-red-400", 
        icon: <TrendingUp className="w-4 h-4" />
      };
    }
  };

  const bmi = calculateBMI(physicalData.weight, physicalData.height);
  const bmiInfo = getBMICategory(bmi);

  const handleUpdateData = async (newData: PhysicalData) => {
    try {
      const updateData = {
        height_cm: newData.height,
        weight_kg: newData.weight,
        age: newData.age,
        gender: newData.gender.charAt(0).toUpperCase() + newData.gender.slice(1)
      };
      
      const response = await api.updatePhysicalMetricsData(updateData);
      if (response.status === 'success') {
        setPhysicalData(newData);
        toast({
          title: "Physical Data Updated",
          description: "Your physical metrics have been successfully updated.",
        });
        fetchPhysicalData(); // Refresh data
      }
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to update physical data. Please try again.",
        variant: "destructive"
      });
    }
    setIsEditOpen(false);
  };

  if (isLoading) {
    return (
      <DashboardCard title="📊 Physical Metrics" variant="physical" size="lg">
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardCard>
    );
  }

  return (
    <>
      <DashboardCard title="📊 Physical Metrics" variant="physical" size="lg">
        <div className="space-y-6">
          {/* Header with Edit Button */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-foreground">Your Health Profile</h3>
              <p className="text-sm text-muted-foreground">Personal metrics for AI coaching</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditOpen(true)}
              className="border-physical/30 hover:bg-physical/10"
            >
              <Edit3 className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>

          {/* Main Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Height */}
            <div className="glass p-4 rounded-xl text-center">
              <Ruler className="w-6 h-6 mx-auto mb-2 text-physical" />
              <div className="text-sm text-muted-foreground">Height</div>
              <div className="text-xl font-bold text-physical">{physicalData.height}</div>
              <div className="text-xs text-muted-foreground">cm</div>
            </div>

            {/* Weight */}
            <div className="glass p-4 rounded-xl text-center">
              <Scale className="w-6 h-6 mx-auto mb-2 text-physical" />
              <div className="text-sm text-muted-foreground">Weight</div>
              <div className="text-xl font-bold text-physical">{physicalData.weight}</div>
              <div className="text-xs text-muted-foreground">kg</div>
            </div>

            {/* Age */}
            <div className="glass p-4 rounded-xl text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-physical" />
              <div className="text-sm text-muted-foreground">Age</div>
              <div className="text-xl font-bold text-physical">{physicalData.age}</div>
              <div className="text-xs text-muted-foreground">years</div>
            </div>

            {/* Gender */}
            <div className="glass p-4 rounded-xl text-center">
              <User className="w-6 h-6 mx-auto mb-2 text-physical" />
              <div className="text-sm text-muted-foreground">Gender</div>
              <div className="text-lg font-bold text-physical capitalize">{physicalData.gender}</div>
            </div>
          </div>

          {/* BMI Section */}
          <div className="glass p-5 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-physical" />
                <h4 className="font-semibold">Body Mass Index (BMI)</h4>
              </div>
              <Badge variant="secondary" className={`${bmiInfo.color} bg-physical/10`}>
                <span className="flex items-center space-x-1">
                  {bmiInfo.icon}
                  <span>{bmiInfo.category}</span>
                </span>
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-4xl font-bold text-physical mb-2">{bmi}</div>
              <div className="text-sm text-muted-foreground">
                Your BMI indicates you are in the <span className={`font-medium ${bmiInfo.color}`}>
                  {bmiInfo.category.toLowerCase()}
                </span> range
              </div>
            </div>

            {/* BMI Range Indicator */}
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Underweight</span>
                <span>Normal</span>
                <span>Overweight</span>
                <span>Obese</span>
              </div>
              <div className="relative h-2 bg-gradient-to-r from-blue-400 via-green-400 via-yellow-400 to-red-400 rounded-full">
                <div 
                  className="absolute top-0 w-2 h-2 bg-white border-2 border-physical rounded-full transform -translate-x-1/2"
                  style={{ left: `${Math.min(Math.max((bmi / 40) * 100, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>18.5</span>
                <span>25</span>
                <span>30</span>
                <span>40+</span>
              </div>
            </div>
          </div>

          {/* AI Integration Note */}
          <div className="bg-physical/5 border border-physical/20 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-physical rounded-full mt-2 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-foreground">AI Coach Integration</div>
                <div className="text-xs text-muted-foreground mt-1">
                  This data helps your Physical Coach provide personalized nutrition advice, 
                  workout plans, and health recommendations tailored specifically to your profile.
                </div>
              </div>
            </div>
          </div>
        </div>
      </DashboardCard>

      <EditPhysicalDataDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        currentData={physicalData}
        onSave={handleUpdateData}
      />
    </>
  );
};