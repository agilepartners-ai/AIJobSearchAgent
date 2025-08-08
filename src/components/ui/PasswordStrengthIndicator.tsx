import React from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import FirebaseAuthService from '../../services/firebaseAuthService';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  className?: string;
}

const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password,
  showRequirements = false,
  className = ''
}) => {
  const validation = FirebaseAuthService.validatePasswordStrength(password);

  if (!password) return null;

  const getStrengthColor = (strength: string) => {
    switch (strength) {
      case 'weak': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'strong': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getBarColor = (strength: string, level: number) => {
    const maxLevel = strength === 'weak' ? 1 : strength === 'medium' ? 2 : 3;
    if (level <= maxLevel) {
      switch (strength) {
        case 'weak': return 'bg-red-400';
        case 'medium': return 'bg-yellow-400';
        case 'strong': return 'bg-green-400';
        default: return 'bg-gray-400';
      }
    }
    return 'bg-white/20';
  };

  const requirements = [
    { text: 'At least 6 characters', met: password.length >= 6 },
    { text: 'Contains uppercase letter', met: /[A-Z]/.test(password) },
    { text: 'Contains lowercase letter', met: /[a-z]/.test(password) },
    { text: 'Contains number', met: /[0-9]/.test(password) },
    { text: 'Contains special character', met: /[^A-Za-z0-9]/.test(password) },
  ];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Strength bars */}
      <div className="flex gap-1">
        {[1, 2, 3].map((level) => (
          <div
            key={level}
            className={`h-1 flex-1 rounded transition-colors duration-200 ${getBarColor(validation.strength, level)}`}
          />
        ))}
      </div>

      {/* Strength text */}
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium ${getStrengthColor(validation.strength)}`}>
          Password strength: {validation.strength}
        </p>
        {validation.isValid && (
          <CheckCircle size={14} className="text-green-400" />
        )}
      </div>

      {/* Error messages */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          {validation.errors.map((error, index) => (
            <p key={index} className="text-xs text-red-300 flex items-center gap-1">
              <AlertCircle size={12} />
              {error}
            </p>
          ))}
        </div>
      )}

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-1 mt-3">
          <p className="text-xs text-blue-200/70 flex items-center gap-1">
            <Info size={12} />
            Password requirements:
          </p>
          {requirements.map((req, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              {req.met ? (
                <CheckCircle size={12} className="text-green-400" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-white/30" />
              )}
              <span className={req.met ? 'text-green-300' : 'text-blue-200/70'}>
                {req.text}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthIndicator;