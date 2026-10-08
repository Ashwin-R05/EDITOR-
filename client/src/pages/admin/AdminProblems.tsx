import React from 'react';
import { FileCode2, Plus } from 'lucide-react';

export const AdminProblems: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileCode2 className="w-6 h-6 text-purple-400" />
            <span>Problem Statements & Pattern Configuration</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-1">
            Configure Round 1 (Palindrome) and Round 2 (Pattern) problem specifications, test cases, and hidden evaluations.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 border border-slate-800 space-y-3">
          <span className="badge badge-info">ROUND 1 PROBLEM</span>
          <h2 className="text-lg font-bold text-white">Palindrome Check</h2>
          <p className="text-xs text-slate-400">
            C program to verify alphanumeric palindrome strings with case-insensitivity.
          </p>
          <div className="text-xs font-mono text-cyan-400 pt-2">
            6 Test Cases (3 Public, 3 Hidden)
          </div>
        </div>

        <div className="glass rounded-xl p-6 border border-slate-800 space-y-3">
          <span className="badge badge-info">ROUND 2 PROBLEM</span>
          <h2 className="text-lg font-bold text-white">Right Triangle Star Pattern</h2>
          <p className="text-xs text-slate-400">
            Configurable pattern problem printing N rows of stars.
          </p>
          <div className="text-xs font-mono text-cyan-400 pt-2">
            6 Test Cases (3 Public, 3 Hidden)
          </div>
        </div>
      </div>
    </div>
  );
};
