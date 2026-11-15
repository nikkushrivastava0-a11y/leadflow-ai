import {expect,type Page} from '@playwright/test';
export async function authGateway(page:Page){
 const gateway=process.env.E2E_AUTH_GATEWAY;if(!gateway||new URL(gateway).hostname!=='127.0.0.1')throw new Error('Local Auth gateway required');
 await page.route('https://synthetic.supabase.co:55444/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['/auth/v1/','/rest/v1/'].some(p=>url.pathname.startsWith(p)))return route.abort();
  const response=await page.request.fetch(gateway+url.pathname+url.search,{method:request.method(),headers:request.headers(),data:request.postDataBuffer()||undefined});
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':process.env.E2E_BASE_URL!,'access-control-allow-credentials':'true'}});
 });
}
export async function login(page:Page,email:string){
 await authGateway(page);await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);
 await page.getByLabel('Password',{exact:true}).fill(process.env.E2E_PASSWORD!);
 await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/);
}
