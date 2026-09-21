import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tags, FolderOpen } from 'lucide-react';
import JobCategories from '../JobCategoryManagement';
import BlogCategoryManagement from '../BlogCategoryManagement';

export const CategoryManagementHub: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('type') || 'jobs';

  const [activeTab, setActiveTab] = useState<'jobs' | 'blogs'>(
    initialTab === 'blogs' ? 'blogs' : 'jobs'
  );

  const handleSwitchTab = (tab: 'jobs' | 'blogs') => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams);
    params.set('type', tab);
    setSearchParams(params);
  };

  return (
    <div className="space-y-6">
      {/* Category Type Switcher Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Tags className="text-orange-500" size={24} />
            Categories & Taxonomies Hub
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Organize platform taxonomy for job listings, industry fields, and editorial blog topics.
          </p>
        </div>

        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
          <button
            onClick={() => handleSwitchTab('jobs')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'jobs'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <Tags size={13} />
            Job Categories
          </button>
          <button
            onClick={() => handleSwitchTab('blogs')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'blogs'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            <FolderOpen size={13} />
            Blog Categories
          </button>
        </div>
      </div>

      {/* Render selected component */}
      {activeTab === 'jobs' ? <JobCategories /> : <BlogCategoryManagement />}
    </div>
  );
};

export default CategoryManagementHub;
