// src/components/TemplatesPanel.jsx
import React, { useState } from 'react';
import { FaStar, FaDownload, FaInfoCircle, FaClock, FaCog } from 'react-icons/fa';
import { workflowTemplates, templateCategories } from '../services/workflowTemplates';
import useWorkflowStore from '../store/workflowStore';

const TemplatesPanel = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const { setNodes, setEdges, setWorkflowName, addTerminalLog } = useWorkflowStore();

  const loadTemplate = (template) => {
    setNodes(template.nodes);
    setEdges(template.edges);
    setWorkflowName(template.name);
    
    addTerminalLog(`✅ Loaded template: ${template.name}`, 'success');
    addTerminalLog(`📋 Template includes ${template.nodes.length} nodes and ${template.edges.length} connections`);
    
    // Show success message
    showPopup(`✅ Template "${template.name}" loaded successfully!`, 'success');
  };

  const showPopup = (message, type = 'info') => {
    const popup = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : 
                   type === 'error' ? 'bg-red-500' : 
                   type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    
    popup.className = `fixed top-4 right-4 ${bgColor} text-white px-4 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out font-semibold`;
    popup.textContent = message;
    document.body.appendChild(popup);
    
    setTimeout(() => {
      if (document.body.contains(popup)) {
        document.body.removeChild(popup);
      }
    }, 3000);
  };

  const getComplexityBadge = (complexity) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800',
      intermediate: 'bg-yellow-100 text-yellow-800',
      advanced: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[complexity]}`}>
        {complexity}
      </span>
    );
  };

  const filteredTemplates = Object.values(workflowTemplates).filter(template => {
    const matchesCategory = selectedCategory === 'all' || 
      templateCategories.find(cat => cat.id === selectedCategory)?.templates.includes(template.id);
    
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <FaStar className="text-yellow-500" />
          <span>Workflow Templates</span>
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Pre-built templates to get started quickly
        </p>
        
        {/* Search */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex space-x-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
              selectedCategory === 'all' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Templates
          </button>
          {templateCategories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap ${
                selectedCategory === category.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredTemplates.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FaInfoCircle className="mx-auto text-3xl mb-2" />
            <p>No templates found</p>
            <p className="text-sm">Try a different search or category</p>
          </div>
        ) : (
          filteredTemplates.map(template => (
            <div
              key={template.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer group"
              onClick={() => loadTemplate(template)}
            >
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                  {template.name}
                </h4>
                {getComplexityBadge(template.complexity)}
              </div>
              
              <p className="text-sm text-gray-600 mb-3">
                {template.description}
              </p>
              
              <div className="flex justify-between items-center text-xs text-gray-500">
                <div className="flex items-center space-x-3">
                  <span className="flex items-center space-x-1">
                    <FaCog />
                    <span>{template.nodes.length} nodes</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <FaClock />
                    <span>5-10 min setup</span>
                  </span>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    loadTemplate(template);
                  }}
                  className="flex items-center space-x-1 bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                >
                  <FaDownload size={10} />
                  <span>Use Template</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="text-xs text-gray-600">
          <p>💡 <strong>Pro Tip:</strong> Customize templates after loading to fit your specific needs</p>
        </div>
      </div>
    </div>
  );
};

export default TemplatesPanel;