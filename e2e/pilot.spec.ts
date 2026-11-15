import {test,expect,type Page} from '@playwright/test';
const name='PW Pilot Enquiry';
async function authGateway(page:Page){
 const gateway=process.env.E2E_AUTH_GATEWAY;if(!gateway||new URL(gateway).hostname!=='127.0.0.1')throw new Error('Local Auth gateway required');
 await page.route('https://synthetic.supabase.co:55444/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(!['/auth/v1/','/rest/v1/'].some(p=>url.pathname.startsWith(p)))return route.abort();
  const response=await page.request.fetch(gateway+url.pathname+url.search,{method:request.method(),headers:request.headers(),data:request.postDataBuffer()||undefined});
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':process.env.E2E_BASE_URL!,'access-control-allow-credentials':'true'}});
 });
}
async function login(page:Page,email:string){
 await authGateway(page);await page.goto('/login');await page.getByLabel('Email',{exact:true}).fill(email);
 await page.getByLabel('Password',{exact:true}).fill(process.env.E2E_PASSWORD!);
 await page.getByRole('button',{name:'Sign In',exact:true}).click();await expect(page).toHaveURL(/\/dashboard$/);
}
async function enquiry(page:Page,spam=false){
 await page.goto('/form/synthetic-a');await page.getByLabel('Full Name',{exact:true}).fill(name);
 await page.getByLabel('Email Address',{exact:true}).fill('pw-pilot@example.test');await page.getByLabel('Phone Number',{exact:true}).fill('+91 9876500123');
 if(spam)await page.locator('input[name="company_website"]').fill('bot',{force:true});
 await page.getByRole('button',{name:'Submit',exact:true}).click();
}
test('full enquiry owner journey, two-account isolation, mobile, spam and protected routes',async({page,browser,request},testInfo)=>{
 await page.goto('/dashboard');await expect(page).toHaveURL(/\/login$/);
 expect((await request.get('/api/cron/automation')).status()).toBe(401);
 expect((await request.post('/api/billing/checkout',{data:{plan:'pilot'}})).status()).toBe(503);
 await enquiry(page);await expect(page.getByRole('heading',{name:'Enquiry saved',exact:true})).toBeVisible();
 await enquiry(page);await expect(page).toHaveURL(/error=duplicate/);
 await enquiry(page,true);await expect(page).toHaveURL(/error=invalid/);
 await login(page,'owner-a@example.test');
 await page.goto('/dashboard?q=PW%20Pilot');await expect(page.getByRole('cell',{name,exact:true})).toBeVisible();
 await page.getByLabel(`Status for ${name}`,{exact:true}).selectOption('contacted');await expect(page.getByText('Lead status updated',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:`Schedule follow-up for ${name}`,exact:true}).click();
 await page.getByLabel(`Follow-up date and time for ${name}`,{exact:true}).fill('2027-01-15T16:00');
 await page.getByRole('row').filter({has:page.getByRole('cell',{name,exact:true})}).getByRole('button',{name:'Save',exact:true}).click();
 await expect(page.getByText('Follow-up saved',{exact:true})).toBeVisible();await page.reload();await expect(page.getByLabel(`Status for ${name}`,{exact:true})).toHaveValue('contacted');
 await expect(page.getByText('2027-01-15 16:00 UTC',{exact:true})).toBeVisible();
 await page.setViewportSize({width:390,height:844});await page.goto('/dashboard/activity');await expect(page.getByRole('heading',{name:'Workspace activity',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2)).toBe(true);
 await page.screenshot({path:testInfo.outputPath('synthetic-mobile-activity.png')});
 const other=await browser.newContext({baseURL:process.env.E2E_BASE_URL}),pageB=await other.newPage();await login(pageB,'owner-b@example.test');
 await pageB.goto(process.env.E2E_BASE_URL+'/dashboard?q=PW%20Pilot');await expect(pageB.getByRole('cell',{name,exact:true})).toHaveCount(0);await other.close();
 await page.goto('/dashboard');await page.getByRole('button',{name:'Logout',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
 await page.goto('/dashboard/activity');await expect(page).toHaveURL(/\/login$/);
});
