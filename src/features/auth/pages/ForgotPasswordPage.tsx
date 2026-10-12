import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../../../shared/ui';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  return (
    <Card variant="outlined" className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Recuperar contraseña</CardTitle>
        <CardDescription>Te enviaremos un enlace para restablecer tu contraseña</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-center text-xs text-amber-700">
          Boceto: el envío de correos aún no está conectado al backend.
        </p>
        {sent ? (
          <div
            role="status"
            className="rounded-2xl border border-green-200 bg-green-50 p-3 text-sm text-green-700"
          >
            Si el email existe en NotePlus, recibirás un enlace de recuperación.
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSent(true))} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="tu@email.com"
              error={errors.email?.message}
              {...register('email')}
              autoComplete="email"
            />
            <Button type="submit" fullWidth className="mt-4">
              Enviar enlace
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="justify-center">
        <a href="/login" className="text-sm font-medium text-blue-600 hover:underline">
          Volver a iniciar sesión
        </a>
      </CardFooter>
    </Card>
  );
}
