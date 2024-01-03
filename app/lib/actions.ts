'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
// 1. Since we're updating the data displayed in the invoices route, we want to clear 
// this cache and trigger a new request to the server. We can do this with the 
// revalidatePath function from Next.js: 
import { revalidatePath } from 'next/cache';
// 2. We also want to redirect the user back to the /dashboard/invoices page. 
// You can do this with the redirect function from Next.js:
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
    .number()
    .gt(0, { message: 'Please enter an amount greater than $0.' }),
  status: z.enum(['pending', 'paid'], {
    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
// Creating an Invoice
export async function createInvoice(prevState: State,formData: FormData) {
    // const {customerId, amount, status} = CreateInvoice.parse({
      const validatedFields = CreateInvoice.safeParse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
    console.log(validatedFields);
    if (!validatedFields.success) {
      return {
        errors: validatedFields.error.flatten().fieldErrors,
        message: 'Missing Fields. Failed to Create Invoice.',
      };
    }
    const { customerId, amount, status } = validatedFields.data;
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try{
      await sql`
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch(error){
      return {
        message: 'Database Error: Failed to Create Invoice.',
      };
    }


  revalidatePath('/dashboard/invoices'); // 1.
  redirect('/dashboard/invoices'); // 2.
}

// Updating an Invoice
export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
      customerId: formData.get('customerId'),
      amount: formData.get('amount'),
      status: formData.get('status'),
    });
   
    const amountInCents = amount * 100;
   
    try{
      await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
    } catch(error){
      return {
        message: 'Database Error: Failed to update Invoice.',
      };
    }

   
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices');
}

// Deleting an Invoice
export async function deleteInvoice(id: string) {
  throw new Error('Failed to Delete Invoice'); // added to check error
  try{
    await sql`DELETE FROM invoices WHERE id = ${id}`;
    revalidatePath('/dashboard/invoices');
  } catch(error){
    return {
      message: 'Database Error: Failed to delete Invoice.',
    };
  }

    // revalidatePath('/dashboard/invoices');
}