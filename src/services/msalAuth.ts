import { PublicClientApplication, Configuration } from "@azure/msal-browser";

const msalConfig: Configuration = {
  auth: {
    clientId: "4b5d7319-2bd1-4c24-904c-f6ffd4c1dc40",
    authority: "https://login.microsoftonline.com/f362570b-fb69-4982-be6e-073ba6a5fa6c",
    redirectUri: "http://localhost",
  },
  cache: {
    cacheLocation: "localStorage",
  },
};

let pca: PublicClientApplication | null = null;

async function getPca() {
  if (!pca) {
    pca = new PublicClientApplication(msalConfig);
    await pca.initialize();
  }
  return pca;
}

export async function login() {
  const instance = await getPca();
  const response = await instance.loginPopup({
    scopes: ["User.Read", "Tasks.ReadWrite"],
  });
  instance.setActiveAccount(response.account);
  return response;
}

export async function logout() {
  const instance = await getPca();
  await instance.logoutPopup();
}

export async function getToken() {
  const instance = await getPca();
  const account = instance.getActiveAccount() || instance.getAllAccounts()[0];
  if (!account) return null;

  try {
    const response = await instance.acquireTokenSilent({
      scopes: ["User.Read", "Tasks.ReadWrite"],
      account: account,
    });
    return response.accessToken;
  } catch (error) {
    const response = await instance.acquireTokenPopup({
      scopes: ["User.Read", "Tasks.ReadWrite"],
    });
    return response.accessToken;
  }
}

export async function getActiveAccount() {
  const instance = await getPca();
  return instance.getActiveAccount() || instance.getAllAccounts()[0];
}
