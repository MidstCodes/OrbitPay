'use client';

/**
 * Footer component for OrbitPay.
 * Displays copyright, version, and useful links.
 */

import React from 'react';

const footerLinks = [
  { label: 'Documentation', href: '#' },
  { label: 'API', href: '#' },
  { label: 'Stellar Explorer', href: 'https://stellar.expert/explorer/testnet' },
  { label: 'GitHub', href: '#' },
];

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Copyright */}
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} OrbitPay. Built on{' '}
            <a
              href="https://stellar.org"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 transition-colors"
            >
              Stellar
            </a>
          </p>

          {/* Links */}
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            {footerLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Version */}
          <p className="text-xs text-gray-400">v1.0.0</p>
        </div>
      </div>
    </footer>
  );
}
