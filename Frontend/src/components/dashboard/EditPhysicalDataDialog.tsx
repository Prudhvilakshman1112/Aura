import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Ruler, Scale, Calendar, User } from "lucide-react";

interface PhysicalData {
  height: number;
  weight: number;
  age: number;
  gender: 'male' | 'female' | 'other';
}

interface EditPhysicalDataDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentData: PhysicalData;
  onSave: (data: PhysicalData) => void;
}

export const EditPhysicalDataDialog = ({
  isOpen,
  onClose,
  currentData,
  onSave
}: EditPhysicalDataDialogProps) => {
  const [formData, setFormData] = useState<PhysicalData>(currentData);
  const [errors, setErrors] = useState<Partial<PhysicalData>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<PhysicalData> = {};

    if (!formData.height || formData.height < 100 || formData.height > 250) {
      newErrors.height = formData.height as any;
    }
    if (!formData.weight || formData.weight < 30 || formData.weight > 300) {
      newErrors.weight = formData.weight as any;
    }
    if (!formData.age || formData.age < 10 || formData.age > 100) {
      newErrors.age = formData.age as any;
    }
    if (!formData.gender) {
      newErrors.gender = formData.gender as any;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };

  const handleInputChange = (field: keyof PhysicalData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glass border-physical/20">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-physical" />
            <span>Edit Physical Data</span>
          </DialogTitle>
          <DialogDescription>
            Update your physical metrics for personalized AI coaching recommendations.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          {/* Height */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="height" className="text-right flex items-center justify-end space-x-1">
              <Ruler className="w-4 h-4 text-physical" />
              <span>Height</span>
            </Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Input
                  id="height"
                  type="number"
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', Number(e.target.value))}
                  className={`${errors.height ? 'border-red-400' : 'border-input'}`}
                  placeholder="175"
                />
                <span className="text-sm text-muted-foreground">cm</span>
              </div>
              {errors.height && (
                <p className="text-xs text-red-400 mt-1">Height must be between 100-250 cm</p>
              )}
            </div>
          </div>

          {/* Weight */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="weight" className="text-right flex items-center justify-end space-x-1">
              <Scale className="w-4 h-4 text-physical" />
              <span>Weight</span>
            </Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Input
                  id="weight"
                  type="number"
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', Number(e.target.value))}
                  className={`${errors.weight ? 'border-red-400' : 'border-input'}`}
                  placeholder="70"
                />
                <span className="text-sm text-muted-foreground">kg</span>
              </div>
              {errors.weight && (
                <p className="text-xs text-red-400 mt-1">Weight must be between 30-300 kg</p>
              )}
            </div>
          </div>

          {/* Age */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="age" className="text-right flex items-center justify-end space-x-1">
              <Calendar className="w-4 h-4 text-physical" />
              <span>Age</span>
            </Label>
            <div className="col-span-3">
              <div className="flex items-center space-x-2">
                <Input
                  id="age"
                  type="number"
                  value={formData.age}
                  onChange={(e) => handleInputChange('age', Number(e.target.value))}
                  className={`${errors.age ? 'border-red-400' : 'border-input'}`}
                  placeholder="22"
                />
                <span className="text-sm text-muted-foreground">years</span>
              </div>
              {errors.age && (
                <p className="text-xs text-red-400 mt-1">Age must be between 10-100 years</p>
              )}
            </div>
          </div>

          {/* Gender */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="gender" className="text-right">Gender</Label>
            <div className="col-span-3">
              <Select 
                value={formData.gender} 
                onValueChange={(value: 'male' | 'female' | 'other') => handleInputChange('gender', value)}
              >
                <SelectTrigger className={`${errors.gender ? 'border-red-400' : 'border-input'}`}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <p className="text-xs text-red-400 mt-1">Please select your gender</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-gradient-physical hover:opacity-90"
          >
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};