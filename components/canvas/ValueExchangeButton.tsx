'use client';


import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface ValueExchangeButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

const ValueExchangeButton: React.FC<ValueExchangeButtonProps> = ({ onClick, isOpen }) => {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <Button
        onClick={onClick}
        className={`apple-button-secondary px-6 py-4 flex items-center gap-3 transition-all duration-200 ${
          isOpen ? 'bg-blue-100 border-blue-300' : ''
        }`}
        aria-label="View value exchanges between entities"
      >
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <ArrowUpRight className="h-3 w-3 text-white" />
        </div>
        <span className="font-medium text-sm">Value Exchanges</span>
      </Button>
    </div>
  );
};

export default ValueExchangeButton;
