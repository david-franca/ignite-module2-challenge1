import { AxiosResponse } from "axios";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";

import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCardRef = useRef<Product[]>();

  useEffect(() => {
    prevCardRef.current = cart;
  });

  const cartPreviousValue = prevCardRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const updatedCart = [...cart];
      const verifyCart = updatedCart.find(
        (product) => product.id === productId
      );

      if (verifyCart) {
        return await updateProductAmount({
          productId,
          amount: verifyCart.amount + 1,
        });
      }

      const product = await api.get(`products/${productId}`);
      const newProduct = { ...product.data, amount: 1 };
      updatedCart.push(newProduct);
      setCart(updatedCart);
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart];
      const isFound = updatedCart.some(
        (product) => !!(product.id === productId)
      );

      if (!isFound) {
        throw new Error();
      }
      const cartFiltered = updatedCart.filter((product) => {
        return product.id !== productId && product;
      });
      setCart(cartFiltered);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (productId && amount > 0) {
        const { data: stock }: AxiosResponse<Stock> = await api.get(
          `stock/${productId}`
        );
        if (stock.amount < amount) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }
        const updatedCart = [...cart];
        const cartFiltered = updatedCart.filter((product) => {
          if (product.id === productId) {
            product.amount = amount;
            return product;
          }
          return product;
        });
        setCart(cartFiltered);
      } else {
        throw new Error();
      }
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
