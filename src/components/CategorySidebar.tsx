import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/lib/i18n';
import type { Category } from '@/types';

interface CategoryItemProps {
  category: Category;
  level?: number;
}

function CategoryItem({ category, level = 0 }: CategoryItemProps) {
  const { selectedCategory, setSelectedCategory, language } = useAppStore();
  const isActive = selectedCategory === category.id;
  const hasChildren = category.children && category.children.length > 0;
  
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[category.icon || 'Package'];
  
  const displayName = language === 'ru' ? category.nameRu : language === 'zh' ? category.nameZh : category.name;

  return (
    <div>
      <button
        onClick={() => setSelectedCategory(category.id)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
          isActive 
            ? "bg-primary text-primary-foreground" 
            : "hover:bg-secondary text-muted-foreground hover:text-foreground",
          level > 0 && "ml-4"
        )}
        style={{ paddingLeft: `${12 + level * 12}px` }}
      >
        {category.imageUrl ? (
          <img src={category.imageUrl} alt={displayName} className="h-4 w-4 rounded object-cover flex-shrink-0" />
        ) : (
          IconComponent && <IconComponent className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="flex-1 text-left truncate">{displayName}</span>
        {category.stockCount !== undefined && category.stockCount > 0 && (
          <span className={cn(
            "text-xs",
            isActive ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {category.stockCount}
          </span>
        )}
      </button>
      
      {hasChildren && (
        <div className="mt-1">
          {category.children!.map(child => (
            <CategoryItem key={child.id} category={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function CategorySidebar() {
  const { categories, selectedCategory, setSelectedCategory, language, searchQuery, setSearchQuery } = useAppStore();

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">{t('categories', language)}</h2>
      </div>
      
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-1">
          {(selectedCategory || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory(null);
                setSearchQuery('');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs rounded-md border border-dashed text-primary hover:bg-primary/5 transition-colors"
            >
              <Icons.X className="h-3.5 w-3.5" />
              {language === 'ru' ? 'Сбросить фильтры' : language === 'zh' ? '清除筛选' : 'Clear filters'}
            </button>
          )}

          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
              !selectedCategory 
                ? "bg-primary text-primary-foreground" 
                : "hover:bg-secondary text-muted-foreground hover:text-foreground"
            )}
          >
            <Icons.Home className="h-4 w-4 flex-shrink-0" />
            <span className="flex-1 text-left">{t('allProducts', language)}</span>
          </button>
          
          <div className="pt-2 border-t border-border mt-2">
            {categories.map(category => (
              <CategoryItem key={category.id} category={category} />
            ))}
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Total:</span>
          <span>{categories.reduce((sum, c) => sum + (c.stockCount || 0), 0)} accounts</span>
        </div>
      </div>
    </div>
  );
}
