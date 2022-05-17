import { AxiosResponse } from "axios";
import { createContext, ReactNode, useContext, useState } from "react";
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

  const addProduct = async (productId: number) => {
    try {
      const verifyCart = cart.reduce((acc, product) => {
        if (product.id === productId) {
          return product;
        }
        return acc;
      }, {} as Product);

      if (verifyCart.id) {
        return await updateProductAmount({
          productId,
          amount: verifyCart.amount + 1,
        });
      }

      const response = await api.get(`products/${productId}`);
      const data = [...cart, { ...response.data, amount: 1 }];
      setCart(data);
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(data));
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      if (productId) {
        const isFound = cart.some((product) => !!(product.id === productId));

        if (!isFound) {
          toast.error("Erro na remoção do produto");
          return;
        }
        const cartFiltered = cart.filter((product) => {
          return product.id !== productId && product;
        });
        setCart(cartFiltered);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartFiltered));
      }
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
        const cartFiltered = cart.filter((product) => {
          if (product.id === productId) {
            product.amount = amount;
            return product;
          }
          return product;
        });
        setCart(cartFiltered);
        localStorage.setItem("@RocketShoes:cart", JSON.stringify(cartFiltered));
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
