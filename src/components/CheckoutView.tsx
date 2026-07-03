import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { orderApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ShoppingCart, Wallet, Bitcoin, ArrowLeft, CheckCircle, AlertCircle, CreditCard, Loader2 } from 'lucide-react';

// Simple cart state from localStorage
function getCart(): Array<{ productId: string; quantity: number; title?: string; price?: number }> {
  try {
    const raw = localStorage.getItem('hsello-cart');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function clearCart() {
  localStorage.removeItem('hsello-cart');
  window.dispatchEvent(new Event('cart-updated'));
}

export function CheckoutView() {
  const { user, isAuthenticated } = useAuthStore();
  const [cart] = useState(getCart());
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE');
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<string | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
  const platformFee = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + platformFee;
  const cartUnits = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast.error('Please log in to place an order');
      return;
    }

    if (cart.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setIsProcessing(true);

    try {
      const { data, error } = await orderApi.createOrder({
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        paymentMethod,
      });

      if (error) {
        toast.error(error);
        setIsProcessing(false);
        return;
      }

      clearCart();
      setCompletedOrderId(data?.order?.id || null);
      setOrderComplete(true);
      toast.success('Order placed successfully!');
    } catch {
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToMarketplace = () => {
    // Navigate back
    window.history.back();
  };

  if (orderComplete && completedOrderId) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Order Placed!</CardTitle>
            <CardDescription>
              Your order #{completedOrderId.slice(0, 8)} has been placed successfully
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Order Details</p>
              <div className="flex justify-between items-center">
                <span>Total</span>
                <span className="font-bold">${total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-3 justify-center">
            <Button onClick={() => { window.location.href = '/'; }}>
              Continue Shopping
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="container py-8 max-w-2xl mx-auto">
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <CardTitle>Cart is Empty</CardTitle>
            <CardDescription>Add items to your cart before checking out</CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={handleBackToMarketplace}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Shopping
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-4 md:py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBackToMarketplace}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
              <p className="text-sm text-muted-foreground">Review details and complete payment securely</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-lg border p-2.5">
              <p className="text-xs text-muted-foreground">Items</p>
              <p className="font-semibold">{cartUnits}</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold">${subtotal.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-xs text-muted-foreground">Fee (5%)</p>
              <p className="font-semibold">${platformFee.toFixed(2)}</p>
            </div>
            <div className="rounded-lg border p-2.5">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold text-primary">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Order Items</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {cart.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between border-b py-2 last:border-0">
                    <div>
                      <p className="font-medium">{item.title || 'Product'}</p>
                      <Badge variant="secondary" className="mt-1">Qty: {item.quantity}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${((item.price || 0) * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" /> Payment Method</CardTitle></CardHeader>
              <CardContent>
                <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'BALANCE' | 'CRYPTO')} className="space-y-3">
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${paymentMethod === 'BALANCE' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="BALANCE" id="balance" />
                    <Label htmlFor="balance" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-medium">Account Balance</p>
                          <p className="text-sm text-muted-foreground">{user?.email || 'Not logged in'}</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer ${paymentMethod === 'CRYPTO' ? 'border-primary bg-primary/5' : ''}`}>
                    <RadioGroupItem value="CRYPTO" id="crypto" />
                    <Label htmlFor="crypto" className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Bitcoin className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="font-medium">Cryptocurrency</p>
                          <p className="text-sm text-muted-foreground">BTC, ETH, USDT, TRX</p>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card className="sticky top-4">
              <CardHeader><CardTitle className="text-lg">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-lg border p-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Platform Fee (5%)</span><span>${platformFee.toFixed(2)}</span></div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <div className="text-right"><p className="text-xl font-bold text-primary">${total.toFixed(2)}</p></div>
                </div>
                <div className="rounded-lg border p-3 text-xs text-muted-foreground">
                  <p className="font-medium text-foreground">Payment assurances</p>
                  <p>• Instant delivery after confirmation</p>
                  <p>• 24/7 support and dispute handling</p>
                  <p>• Order history available in your account</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" disabled={isProcessing || !isAuthenticated} onClick={handlePlaceOrder}>
                  {isProcessing ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>) : (<><CheckCircle className="w-4 h-4 mr-2" /> Place Order</>)}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}