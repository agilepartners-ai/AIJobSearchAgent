import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { TEMPLATE_REGISTRY, TemplateId } from '@/lib/templateRegistry';
import { UserProfileData } from '@/services/profileService';
import { cn } from '@/lib/utils';

interface TemplatePickerProps {
  currentTemplateId: TemplateId;
  profileData: UserProfileData;
  onSelect: (id: TemplateId) => void;
}

export const TemplatePicker: React.FC<TemplatePickerProps> = ({
  currentTemplateId,
  profileData,
  onSelect,
}) => {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4">
        {(Object.values(TEMPLATE_REGISTRY)).map((template) => {
          const isSelected = currentTemplateId === template.id;
          const PreviewComponent = template.previewComponent;

          return (
            <div key={template.id} className="flex flex-col items-center gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(template.id)}
                className={cn(
                  "relative w-[200px] h-[283px] cursor-pointer rounded-lg overflow-hidden border-2 transition-all duration-200 shadow-md",
                  isSelected 
                    ? "ring-2 ring-offset-2 border-transparent" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                style={{ 
                  borderColor: isSelected ? template.accentColor : undefined,
                  boxShadow: isSelected ? `0 0 0 2px ${template.accentColor}40` : undefined,
                  ringColor: template.accentColor 
                } as any}
              >
                {/* Scaled Preview */}
                <div className="absolute inset-0 pointer-events-none origin-top-left scale-[0.252]">
                  <PreviewComponent data={profileData} isPreview={true} />
                </div>

                {/* Selection Overlay */}
                {isSelected && (
                  <div 
                    className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-lg z-10"
                    style={{ backgroundColor: template.accentColor }}
                  >
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
                
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors z-0" />
              </motion.div>
              
              <div className="text-center">
                <p className={cn(
                  "text-sm font-bold",
                  isSelected ? "text-gray-900" : "text-gray-600"
                )}>
                  {template.name}
                </p>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[180px] leading-tight">
                  {template.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
