"use client";

// ADMIN_CALCULATOR_INTERNAL_POPUP_V1

import {
  useEffect,
  useState,
} from "react";

import {
  createPortal,
} from "react-dom";


export default function AdminCalculatorPopupController() {
  const [
    isOpen,
    setIsOpen,
  ] = useState(false);

  const [
    mounted,
    setMounted,
  ] = useState(false);


  useEffect(() => {
    setMounted(true);
  }, []);


  useEffect(() => {
    const handleClick = (
      event: MouseEvent
    ) => {
      const target =
        event.target;

      if (
        !(target instanceof Element)
      ) {
        return;
      }

      const trigger =
        target.closest(
          '[data-calculator-popup="true"]'
        );

      if (!trigger) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      setIsOpen(true);
    };


    document.addEventListener(
      "click",
      handleClick,
      true
    );


    return () => {
      document.removeEventListener(
        "click",
        handleClick,
        true
      );
    };
  }, []);


  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";


    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      if (
        event.key === "Escape"
      ) {
        setIsOpen(false);
      }
    };


    window.addEventListener(
      "keydown",
      handleKeyDown
    );


    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [isOpen]);


  if (
    !mounted
    || !isOpen
  ) {
    return null;
  }


  return createPortal(
    <div
      className="
        fixed inset-0
        flex items-center
        justify-center
        bg-slate-950/85
        p-2
        backdrop-blur-sm
        sm:p-5
      "
      style={{
        zIndex: 2147483647,
      }}
      onMouseDown={(event) => {
        if (
          event.target
          === event.currentTarget
        ) {
          setIsOpen(false);
        }
      }}
    >
      <div
        className="
          flex
          h-[96vh]
          w-full
          max-w-[1500px]
          flex-col
          overflow-hidden
          rounded-2xl
          bg-slate-950
          shadow-2xl
          sm:h-[94vh]
          sm:rounded-3xl
        "
      >
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-800
            bg-slate-950
            px-5 py-4
            text-white
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.22em]
                text-blue-400
              "
            >
              Portabilidade PRO
            </p>

            <h3
              className="
                mt-1
                text-lg
                font-black
              "
            >
              Calculadora de Pagamento
            </h3>
          </div>

          <button
            type="button"
            onClick={() =>
              setIsOpen(false)
            }
            className="
              flex h-10 w-10
              items-center
              justify-center
              rounded-xl
              bg-white/10
              text-xl
              font-black
              transition
              hover:bg-white/20
            "
            aria-label="Fechar calculadora"
          >
            ?
          </button>
        </div>

        <iframe
          src="/calculadora-taxas?popup=1"
          title="Calculadora de Pagamento"
          scrolling="yes"
          allow="clipboard-write"
          className="
            min-h-0
            w-full
            flex-1
            border-0
            bg-slate-950
          "
        />
      </div>
    </div>,
    document.body
  );
}
