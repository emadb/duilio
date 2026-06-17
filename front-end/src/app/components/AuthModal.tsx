import * as React from "react"
import { useForm } from "react-hook-form"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card"
import { api } from "../../lib/api"
import { toast } from "sonner"

interface AuthFormValues {
  email: string
  password: string
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [isRegister, setIsRegister] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<AuthFormValues>()

  if (!isOpen) return null

  const onSubmit = async (data: AuthFormValues) => {
    setIsLoading(true)
    try {
      if (isRegister) {
        await api.register(data)
        toast.success("Account created! Please log in.")
        setIsRegister(false)
      } else {
        const response = await api.login(data)
        api.setAuthToken(response.token)
        toast.success("Logged in successfully!")
        onSuccess()
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{isRegister ? "Create an account" : "Login"}</CardTitle>
          <CardDescription>
            {isRegister 
              ? "Enter your email and choose a password to get started." 
              : "Enter your email and password to access your tasks."}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                {...register("password", { 
                  required: "Password is required",
                  minLength: { value: 6, message: "Password must be at least 6 characters" }
                })}
              />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Processing..." : isRegister ? "Register" : "Login"}
            </Button>
            <Button
              type="button"
              variant="link"
              className="w-full"
              onClick={() => {
                setIsRegister(!isRegister)
                reset()
              }}
            >
              {isRegister ? "Already have an account? Login" : "Don't have an account? Register"}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={onClose}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
