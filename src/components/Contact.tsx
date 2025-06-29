import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';

const Contact: React.FC = () => {
  return (
    <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-900">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-1 gap-12">
          <div>
            <span className="text-blue-600 dark:text-blue-400 font-medium text-lg">Contact Us</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6 text-gray-900 dark:text-white">
              Ready to Accelerate Your Career?
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-xl mb-8 leading-relaxed">
              Take the first step towards landing your dream job. Our career experts are here to help you succeed with personalized guidance and cutting-edge AI tools.
            </p>
            
            <div className="relative flex flex-wrap gap-6 justify-between">
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                  <Phone size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Phone Support</h3>
                  <p className="text-gray-600 dark:text-gray-300">+1 (610) 704-2184</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Mon-Fri, 9AM-6PM EST</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                  <Mail size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Email Support</h3>
                  <p className="text-gray-600 dark:text-gray-300">support@myjobsearchagent.com</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">24/7 response within 2 hours</p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 mr-4">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Office</h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    1125 PARK PL APT 206<br />
                    San Mateo, CA 94403-1578,
                    United States
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contact;
