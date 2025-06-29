import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { loadCategories, saveCategories } from '../utils/storage';
import { ChevronUp, ChevronDown } from 'lucide-react';

type SortField = 'name' | 'type' | 'description';
type SortDirection = 'asc' | 'desc';

export function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    type: 'income' as 'income' | 'expense' | 'neutral',
  });
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Load categories on component mount
  useEffect(() => {
    const loadedCategories = loadCategories();
    setCategories(loadedCategories);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewCategory((prev: typeof newCategory) => ({ ...prev, [name]: value }));
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewCategory(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' | 'neutral' }));
  };

  // Generate default color and icon based on type and existing categories
  const getDefaultCategoryProps = (type: 'income' | 'expense' | 'neutral') => {
    const incomeColors = ['#10b981', '#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b'];
    const expenseColors = ['#ef4444', '#f97316', '#84cc16', '#6b7280', '#64748b'];
    const neutralColors = ['#9ca3af', '#6b7280', '#64748b', '#94a3b8', '#71717a'];
    const incomeIcons = ['💰', '📈', '💹', '🏆', '🎯'];
    const expenseIcons = ['📎', '📢', '💻', '⛽', '📋'];
    const neutralIcons = ['❓', '📊', '📝', '🔍', '📋'];
    
    const existingCount = categories.filter(cat => cat.type === type).length;
    const colors = type === 'income' ? incomeColors : type === 'expense' ? expenseColors : neutralColors;
    const icons = type === 'income' ? incomeIcons : type === 'expense' ? expenseIcons : neutralIcons;
    
    return {
      color: colors[existingCount % colors.length],
      icon: icons[existingCount % icons.length]
    };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCategory.name.trim() === '') return;
    
    const { color, icon } = getDefaultCategoryProps(newCategory.type);
    const categoryToAdd: Category = {
      id: Date.now().toString(), // Simple ID generation
      name: newCategory.name.trim(),
      description: newCategory.description.trim() || undefined,
      type: newCategory.type,
      color,
      icon
    };
    
    // Use functional update to ensure we have the latest state
    setCategories(prevCategories => {
      const updatedCategories = [...prevCategories, categoryToAdd];
      
      // Save to localStorage inside the functional update
      saveCategories(updatedCategories);
      
      return updatedCategories;
    });
    
    setNewCategory({ name: '', description: '', type: 'income' });
  };

  const handleDeleteCategory = (categoryId: string) => {
    const updatedCategories = categories.filter(cat => cat.id !== categoryId);
    setCategories(updatedCategories);
    saveCategories(updatedCategories);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCategories = [...categories].sort((a, b) => {
    let aValue: string;
    let bValue: string;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'type':
        aValue = a.type;
        bValue = b.type;
        break;
      case 'description':
        aValue = (a.description || '').toLowerCase();
        bValue = (b.description || '').toLowerCase();
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (sortDirection === 'asc') {
      return aValue.localeCompare(bValue);
    } else {
      return bValue.localeCompare(aValue);
    }
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const getTypeStyles = (type: 'income' | 'expense' | 'neutral') => {
    switch (type) {
      case 'income':
        return 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300';
      case 'expense':
        return 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300';
      case 'neutral':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/50 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Categories</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Manage your transaction categories.
        </p>
      </div>

      {/* Add New Category Section - Now on top */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm p-6 border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add New Category</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={newCategory.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                placeholder="e.g., Internet Hosting"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                id="description"
                name="description"
                value={newCategory.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-200"
                placeholder="Optional description"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Type *
            </label>
            <div className="flex items-center space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={newCategory.type === 'income'}
                  onChange={handleTypeChange}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border ${newCategory.type === 'income' ? 'border-orange-600 bg-orange-600' : 'border-gray-400'} flex items-center justify-center`}>
                  {newCategory.type === 'income' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Income</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={newCategory.type === 'expense'}
                  onChange={handleTypeChange}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border ${newCategory.type === 'expense' ? 'border-orange-600 bg-orange-600' : 'border-gray-400'} flex items-center justify-center`}>
                  {newCategory.type === 'expense' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Expense</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="type"
                  value="neutral"
                  checked={newCategory.type === 'neutral'}
                  onChange={handleTypeChange}
                  className="sr-only"
                />
                <div className={`w-4 h-4 rounded-full border ${newCategory.type === 'neutral' ? 'border-orange-600 bg-orange-600' : 'border-gray-400'} flex items-center justify-center`}>
                  {newCategory.type === 'neutral' && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Neutral</span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            className="w-full md:w-auto bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-6 rounded-xl transition-all duration-200"
          >
            Add Category
          </button>
        </form>
      </div>

      {/* Existing Categories Section - Now below */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl rounded-2xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 transition-all duration-300">
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Existing Categories</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200/50 dark:divide-gray-700/50">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Category</span>
                    {getSortIcon('name')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  onClick={() => handleSort('description')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Description</span>
                    {getSortIcon('description')}
                  </div>
                </th>
                <th 
                  scope="col" 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-150"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Type</span>
                    {getSortIcon('type')}
                  </div>
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800/50 divide-y divide-gray-200/50 dark:divide-gray-700/50">
              {sortedCategories.length > 0 ? (
                sortedCategories.map((cat: Category) => (
                  <tr key={cat.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors duration-150">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center space-x-3">
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-xs"
                          style={{ backgroundColor: cat.color, color: 'white' }}
                        >
                          {cat.icon}
                        </span>
                        <span>{cat.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="break-words max-w-xs">
                        {cat.description || '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeStyles(cat.type)}`}
                      >
                        {cat.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors duration-200"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    No categories added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
