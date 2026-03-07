import { useAppStore } from '@/store/appStore';
import { Icons } from './Icons';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { t } from '@/lib/i18n';
import type { Category } from '@/types';

interface MobileCategoryFilterProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CategoryItemProps {
  category: Category;
  level?: number;
  onSelect: () => void;
}

function CategoryItem({ category, level = 0, onSelect }: CategoryItemProps) {
  const { selectedCategory, language } = useAppStore();
  const isActive = selectedCategory === category.id;
  const hasChildren = category.children && category.children.length > 0;
  
  const IconComponent = (Icons as Record<string, React.ComponentType<{ className?: string }>>)[category.icon || 'Package'];
  
  const displayName = language === 'ru' ? category.nameRu : language === 'zh' ? category.nameZh : category.name;

  return (
    <div>
      <button
        onClick={() => {
          const { setSelectedCategory } = useAppStore.getState();
          setSelectedCategory(category.id);
          onSelect();
        }}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-border/50",
          isActive 
            ? "bg-primary/10 text-primary" 
            : "hover:bg-secondary text-foreground"
        )}
        style={{ paddingLeft: `${16 + level * 16}px` }}
      >
        {category.imageUrl ? (
          <img src={category.imageUrl} alt={displayName} className="h-5 w-5 rounded object-cover flex-shrink-0" />
        ) : (
          IconComponent && <IconComponent className="h-5 w-5 flex-shrink-0" />
        )}
        <span className="flex-1 text-left">{displayName}</span>
        {category.stockCount !== undefined && category.stockCount > 0 && (
          <span className="text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
            {category.stockCount}
          </span>
        )}
      </button>
      
      {hasChildren && (
        <div>
          {category.children!.map(child => (
            <CategoryItem key={child.id} category={child} level={level + 1} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MobileCategoryFilter({ isOpen, onClose }: MobileCategoryFilterProps) {
  const { categories, selectedCategory, setSelectedCategory, language } = useAppStore();

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:w-[350px] p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Icons.List className="h-5 w-5" />
            {t('categories', language)}
          </SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-[calc(100vh-80px)]">
          <div>
            <button
              onClick={() => {
                setSelectedCategory(null);
                onClose();
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors border-b border-border/50",
                !selectedCategory 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-secondary text-foreground"
              )}
            >
              <Icons.Home className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1 text-left font-medium">{t('allProducts', language)}</span>
            </button>
            
            {categories.map(category => (
              <CategoryItem 
                key={category.id} 
                category={category} 
                onSelect={onClose}
              />
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
