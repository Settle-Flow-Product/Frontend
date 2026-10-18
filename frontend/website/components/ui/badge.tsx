import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * A badge always renders its text.
 *
 * The colour variants below carry meaning, but never carry it alone: a colour-blind reader needs
 * the word, and so does anyone reading a screenshot pasted into a submission form.
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold w-fit whitespace-nowrap shrink-0 [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        outline: 'text-foreground',
        ok: 'border-ok/30 bg-ok-bg text-ok-foreground',
        warn: 'border-warn/30 bg-warn-bg text-warn-foreground',
        err: 'border-err/30 bg-err-bg text-err-foreground',
        info: 'border-info/30 bg-info-bg text-info-foreground',
        muted: 'border-border bg-muted text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
