import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-5 text-center">
        <p className="text-sm text-muted-foreground font-medium">&copy; {new Date().getFullYear()} Sri Vinayaka Tenders. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
