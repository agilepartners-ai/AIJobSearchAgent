import React from 'react';
import { Crown, Star, Check, X, ArrowRight, CreditCard, Shield, Zap } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userProfile?: any;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  userProfile,
}) => {
  if (!isOpen) return null;

  const proFeatures = [
    { icon: <Zap className="w-4 h-4" />, text: 'Unlimited job applications tracking' },
    { icon: <Star className="w-4 h-4" />, text: 'AI-powered resume optimization' },
    { icon: <Crown className="w-4 h-4" />, text: 'Advanced interview preparation' },
    { icon: <Shield className="w-4 h-4" />, text: 'Priority customer support' },
    { icon: <CreditCard className="w-4 h-4" />, text: 'Advanced analytics and insights' },
    { icon: <Check className="w-4 h-4" />, text: 'Custom job alerts and notifications' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="relative p-6 pb-4">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
          
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full mb-4">
              <Crown size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Upgrade to Pro
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Unlock powerful features to accelerate your job search
            </p>
          </div>
        </div>

        {/* Pricing */}
        <div className="px-6 pb-4">
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 text-center border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Star className="text-yellow-500" size={20} />
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                SPECIAL OFFER
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-4xl font-bold text-purple-600 dark:text-purple-400">$29</span>
              <span className="text-gray-500 dark:text-gray-400">/month</span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
              MockInterview Pro Subscription
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              🎉 7-day free trial • Cancel anytime
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="px-6 pb-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
            What's included:
          </h3>
          <div className="space-y-3">
            {proFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
                  <Check size={12} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-purple-600 dark:text-purple-400">
                  {feature.icon}
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* User Info */}
        {userProfile && (
          <div className="px-6 pb-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Upgrading account for:
              </div>
              <div className="font-medium text-gray-900 dark:text-white">
                {userProfile.full_name || userProfile.email || 'Current User'}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <button
            onClick={onConfirm}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white py-4 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity"></div>
            <CreditCard size={20} className="relative z-10" />
            <span className="relative z-10">Start Free Trial</span>
            <ArrowRight size={18} className="relative z-10" />
          </button>
          
          <button
            onClick={onClose}
            className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 py-3 px-4 rounded-xl font-medium transition-colors"
          >
            Maybe Later
          </button>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
            <Shield size={14} />
            <span>Secure checkout powered by RevenueCat</span>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            SSL encrypted • 30-day money-back guarantee
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
