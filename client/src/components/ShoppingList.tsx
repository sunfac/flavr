import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ShoppingListProps {
  items: string[];
  onClose: () => void;
}

export default function ShoppingList({ items, onClose }: ShoppingListProps) {
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const handleItemCheck = (index: number) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedItems(newChecked);
  };

  const handleShareList = () => {
    if (navigator.share) {
      navigator.share({
        title: "Shopping List",
        text: items.join("\n"),
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(items.join("\n"));
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-4 z-50 flex items-center justify-center">
        <Card className="w-full max-w-md max-h-[80vh] overflow-hidden animate-slide-up">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="font-playfair">Shopping List</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0"
              onClick={onClose}
            >
              <i className="fas fa-times"></i>
            </Button>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="max-h-80 overflow-y-auto space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted">
                  <Checkbox 
                    checked={checkedItems.has(index)}
                    onCheckedChange={() => handleItemCheck(index)}
                  />
                  <span className={`flex-1 ${checkedItems.has(index) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex space-x-2 pt-4 border-t border-border">
              <Button 
                onClick={handleShareList}
                variant="outline"
                className="flex-1"
              >
                <i className="fas fa-share mr-2"></i>Share
              </Button>
              <Button 
                onClick={onClose}
                className="flex-1"
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
