import { Search, X } from "lucide-react";
import * as React from "react";
import { cn } from "../../../utils/cn";
import { controlBase, focusRing, focusWithinRing, interactiveBase } from "../styles";
import type { SearchInputProps } from "./search-input.types";

/**
 * Text input with a search affordance and a clear button. Pure — placeholder
 * and accessible names are injected via props (never reads i18n). Composes the
 * shared control tokens so it focuses and looks like every other field.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>((props, ref) => {
  const {
    value,
    onValueChange,
    onClear,
    placeholder,
    ariaLabel,
    clearLabel = "Clear",
    className,
    ...rest
  } = props;

  const handleClear = () => {
    if (onClear) onClear();
    else onValueChange("");
  };

  return (
    <div className={cn(controlBase, focusWithinRing, "flex items-center gap-1.5", className)}>
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <input
        ref={ref}
        type="search"
        value={value}
        aria-label={ariaLabel}
        placeholder={placeholder}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "w-0 flex-1 bg-transparent text-foreground outline-none",
          "[&::-webkit-search-cancel-button]:appearance-none",
        )}
        {...rest}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={handleClear}
          className={cn(
            interactiveBase,
            focusRing,
            "shrink-0 rounded-sm text-muted-foreground hover:text-foreground",
          )}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
SearchInput.displayName = "SearchInput";
