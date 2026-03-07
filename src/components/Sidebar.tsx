import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { cn, getStockClass } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { Category } from '@/types';

interface CategoryTreeItemProps {
  category: Category;
  level?: number;
}

function CategoryTreeItem({ category, level = 0 }: CategoryTreeItemProps) {
  const { selectedCategory, setSelectedCategory } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = category.children && category.children.length > 0;
  const isActive = selectedCategory === category.id;
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[category.icon || 'List'];

  const handleClick = () => {
    setSelectedCategory(category.id);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded-md cursor-pointer category-tree-item",
        isActive && "active",
        level > 0 && "ml-4"
      )}>
        <div 
          className="flex items-center gap-2 flex-1"
          onClick={handleClick}
          style={{ paddingLeft: `${level * 12}px` }}
        >
          {IconComponent && <IconComponent className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm flex-1">{category.name}</span>
          {category.stockCount !== undefined && category.stockCount > 0 && (
            <span className={cn("text-xs font-mono", getStockClass(category.stockCount))}>
              {category.stockCount}
            </span>
          )}
        </div>
        {hasChildren && (
          <CollapsibleTrigger asChild onClick={(e) => e.stopPropagation()}>
            <button className="p-1 hover:bg-secondary rounded">
              <Icons.ChevronDown 
                className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} 
              />
            </button>
          </CollapsibleTrigger>
        )}
      </div>
      {hasChildren && (
        <CollapsibleContent>
          {category.children!.map(child => (
            <CategoryTreeItem 
              key={child.id} 
              category={child} 
              level={level + 1}
            />
          ))}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}

export function Sidebar() {
  const { categories, selectedCategory, setSelectedCategory } = useAppStore();

  return (
    <aside className="w-64 border-r border-border bg-sidebar-background flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-sm font-semibold text-sidebar-foreground uppercase tracking-wider">
          Categories
        </h2>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          <div
            className={cn(
              "flex items-center gap-2 py-1.5 px-2 rounded-md cursor-pointer category-tree-item",
              !selectedCategory && "active"
            )}
            onClick={() => setSelectedCategory(null)}
          >
            <Icons.Home className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">All Products</span>
          </div>
          {categories.map(category => (
            <CategoryTreeItem key={category.id} category={category} />
          ))}
        </div>
      </ScrollArea>
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Total Products: {categories.reduce((sum, cat) => sum + (cat.stockCount || 0), 0)}</p>
          <p>Live Suppliers: {new Set(categories.flatMap(c => 
            c.children?.flatMap(ch => 
              ch.children?.map(grand => grand.stockCount || 0) || []
            ) || []
          )).size}</p>
        </div>
      </div>
    </aside>
  );
}
