import { Capacitor, registerPlugin } from '@capacitor/core';

export type AutofillStatus = {
  supported: boolean;
  serviceSelected: boolean;
  captureEnabled: boolean;
  pendingCount: number;
};
export type PendingLogin = {
  id: string;
  appPackage: string;
  webDomain: string; // UNVERIFIED: originating web view may supply an arbitrary host
  username: string;
  capturedAt: number;
};
export type PendingSecret = PendingLogin & {password:string};

type NativeAutofill = {
  getStatus():Promise<AutofillStatus>;
  setCaptureEnabled(input:{enabled:boolean}):Promise<AutofillStatus>;
  openSystemSettings():Promise<void>;
  listPending():Promise<{items:PendingLogin[]}>;
  readPending(input:{id:string}):Promise<PendingSecret>;
  discardPending(input:{id:string}):Promise<void>;
};
const native=registerPlugin<NativeAutofill>('ParolaAutofill');
export const autofillAvailable=():boolean=>Capacitor.getPlatform()==='android';
export const autofillStatus=():Promise<AutofillStatus> => autofillAvailable() ?
  native.getStatus() : Promise.resolve({supported:false,serviceSelected:false,captureEnabled:false,pendingCount:0});
export const setAutofillEnabled=(enabled:boolean)=>native.setCaptureEnabled({enabled});
export const openAutofillSettings=()=>native.openSystemSettings();
export const listCapturedLogins=()=>native.listPending();
export const readCapturedLogin=(id:string)=>native.readPending({id});
export const discardCapturedLogin=(id:string)=>native.discardPending({id});
