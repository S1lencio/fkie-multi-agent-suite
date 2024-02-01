import React, { createContext, useEffect, useMemo, useState } from 'react';
import ShutdownInterface from '../../main/IPC/ShutdownInterface';

declare global {
  interface Window {
    ShutdownInterface?: ShutdownInterface;
  }
}

export interface IElectronContext {
  shutdownInterface: ShutdownInterface | null;
  terminateSubprocesses: boolean;
  setTerminateSubprocesses: (terminate: boolean) => void;
}

export const DEFAULT = {
  shutdownInterface: null,
  terminateSubprocesses: false,
  setTerminateSubprocesses: () => {},
};

interface IElectronProviderComponent {
  children: React.ReactNode;
}

export const ElectronContext = createContext<IElectronContext>(DEFAULT);

export const ElectronProvider: React.FC<IElectronProviderComponent> = ({
  children,
}) => {
  const [shutdownInterface, setShutdownInterface] =
    useState<ShutdownInterface | null>(null);
  const [terminateSubprocesses, setTerminateSubprocesses] =
    useState<boolean>(false);

  // Effect to initialize the shutdownInterface
  useEffect(() => {
    if (window.ShutdownInterface) {
      setShutdownInterface(window.ShutdownInterface);
    }
  }, []);

  // Effect to initialize the onTerminateSubprocesses callback
  useEffect(() => {
    if (shutdownInterface?.onTerminateSubprocesses) {
      shutdownInterface.onTerminateSubprocesses(() => {
        setTerminateSubprocesses(true);
      });
    }
  }, [shutdownInterface]);

  const attributesMemo = useMemo(
    () => ({
      shutdownInterface,
      terminateSubprocesses,
      setTerminateSubprocesses,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shutdownInterface, terminateSubprocesses],
  );

  return (
    <ElectronContext.Provider value={attributesMemo}>
      {children}
    </ElectronContext.Provider>
  );
};
