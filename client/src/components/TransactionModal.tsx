import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { 
  insertTransactionSchema, 
  Transaction, 
  Category, 
  getRelativeDate,
  getDaysInMonth
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

// Extend the schema for form validation
const formSchema = insertTransactionSchema.extend({
  date: z.date(),
  amount: z.preprocess(
    (a) => parseFloat(a as string),
    z.number().positive()
  ),
  // Fields for relative date handling
  relativeDateType: z.enum(["fixed", "first_day", "last_day", "custom"]).default("fixed"),
  dayOfMonth: z.number().optional(),
});

// Form values type
type FormValues = z.infer<typeof formSchema>;

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransactionCreated: () => void;
  transaction: Transaction | null;
}

export default function TransactionModal({ 
  isOpen, 
  onClose,
  onTransactionCreated,
  transaction 
}: TransactionModalProps) {
  // State to track if we're using a relative date
  const [showRelativeDateOptions, setShowRelativeDateOptions] = useState(false);
  
  // Get categories from the API
  const { data: categories } = useQuery<Category[]>({
    queryKey: ['/api/categories']
  });
  
  // Form setup with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: "expense" as const,
      description: "",
      amount: undefined,
      date: new Date(),
      status: "pending" as const,
      recurrence: "once" as const,
      categoryId: undefined,
      isCleared: false,
      relativeDateType: "fixed" as const,
      dayOfMonth: undefined
    },
  });
  
  // Default form values for new transactions
  const defaultValues: Partial<FormValues> = {
    type: "expense" as const,
    description: "",
    amount: undefined,
    date: new Date(),
    status: "pending" as const,
    recurrence: "once" as const,
    categoryId: undefined,
    isCleared: false,
    relativeDateType: "fixed" as const,
    dayOfMonth: undefined
  };

  // Update form with transaction data when editing, or clear for new entries
  useEffect(() => {
    if (transaction) {
      const isRelativeDate = transaction.relativeDateType && transaction.relativeDateType !== "fixed";
      setShowRelativeDateOptions(isRelativeDate);
      
      form.reset({
        type: transaction.type as "expense" | "income",
        description: transaction.description,
        amount: transaction.amount,
        date: new Date(transaction.date),
        categoryId: transaction.categoryId,
        status: transaction.status as "pending" | "paid" | "cleared",
        recurrence: transaction.recurrence as "once" | "weekly" | "biweekly" | "monthly" | "quarterly" | "yearly",
        isCleared: transaction.isCleared,
        relativeDateType: (transaction.relativeDateType || "fixed") as "fixed" | "first_day" | "last_day" | "custom",
        dayOfMonth: transaction.dayOfMonth || undefined
      });
    } else {
      setShowRelativeDateOptions(false);
      form.reset(defaultValues);
    }
  }, [transaction, form, isOpen]); // Added isOpen to dependencies to reset when modal opens
  
  // Filter categories based on transaction type
  const filteredCategories = categories?.filter(
    category => form.watch("type") === category.type
  ) || [];
  
  // Watch for recurrence changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // If recurrence changes to "once", disable relative date options
      if (name === "recurrence" && value.recurrence === "once" && showRelativeDateOptions) {
        setShowRelativeDateOptions(false);
        form.setValue("relativeDateType", "fixed");
      }
    });
    return () => subscription.unsubscribe();
  }, [form, showRelativeDateOptions]);

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    try {
      // Process data before submission
      let submissionData = { ...data };
      
      // Set original date if this is a recurring transaction (for future instances)
      if (data.recurrence !== "once") {
        if (showRelativeDateOptions) {
          // When using relative dates, we'll use the selected date as the original date reference
          submissionData.originalDate = data.date.toISOString();
        } else {
          // For fixed dates but still recurring, use the selected date as original
          submissionData.originalDate = data.date.toISOString();
          submissionData.relativeDateType = "fixed";
          submissionData.dayOfMonth = undefined;
        }
      } else {
        // For one-time transactions, no need for relative dates
        submissionData.relativeDateType = "fixed";
        submissionData.dayOfMonth = undefined;
        submissionData.originalDate = undefined;
      }
      
      if (transaction) {
        // Update existing transaction
        await apiRequest("PATCH", `/api/transactions/${transaction.id}`, submissionData);
      } else {
        // Create new transaction
        await apiRequest("POST", "/api/transactions", submissionData);
      }
      
      // Reset form after successful submission
      form.reset(defaultValues);
      onTransactionCreated();
    } catch (error) {
      console.error("Error saving transaction:", error);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{transaction ? "Edit Transaction" : "Add Transaction"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Transaction Type */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Transaction Type</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expense" id="expense" />
                        <label htmlFor="expense">Expense</label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="income" id="income" />
                        <label htmlFor="income">Income</label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Rent, Groceries, Paycheck"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <span className="text-slate-500">$</span>
                      </div>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        className="pl-7"
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Category */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value))}
                    value={field.value?.toString() || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Date Selection */}
            <div className="space-y-4">
              {/* Relative Date Toggle */}
              {form.watch("recurrence") !== "once" && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="useRelativeDate"
                    checked={showRelativeDateOptions}
                    onCheckedChange={(checked) => {
                      setShowRelativeDateOptions(!!checked);
                      if (checked) {
                        form.setValue("relativeDateType", "first_day");
                      } else {
                        form.setValue("relativeDateType", "fixed");
                        form.setValue("dayOfMonth", undefined);
                      }
                    }}
                  />
                  <label htmlFor="useRelativeDate" className="text-sm font-medium">
                    Use relative date (e.g., first or last day of month)
                  </label>
                </div>
              )}
              
              {showRelativeDateOptions ? (
                <>
                  {/* Relative Date Type Selector */}
                  <FormField
                    control={form.control}
                    name="relativeDateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date Type</FormLabel>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            // If we switch to custom, initialize dayOfMonth
                            if (value === "custom" && !form.getValues("dayOfMonth")) {
                              form.setValue("dayOfMonth", 15);
                            }
                          }}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select date type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="first_day">First day of month</SelectItem>
                            <SelectItem value="last_day">Last day of month</SelectItem>
                            <SelectItem value="custom">Custom day of month</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Day of Month Input (for custom) */}
                  {form.watch("relativeDateType") === "custom" && (
                    <FormField
                      control={form.control}
                      name="dayOfMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Month</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              {...field}
                              value={field.value || ""}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              ) : (
                /* Standard Date Picker */
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
            
            {/* Recurrence */}
            <FormField
              control={form.control}
              name="recurrence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recurrence</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recurrence" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="once">One-time</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="cleared">Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Cleared Checkbox */}
            <FormField
              control={form.control}
              name="isCleared"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Mark as cleared</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Check this if the transaction has cleared your bank account
                    </p>
                  </div>
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {transaction ? "Update" : "Save"} Transaction
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
