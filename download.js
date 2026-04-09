const fs = require('fs');
const https = require('https');
const path = require('path');

const dir = path.join(__dirname, 'design_assets');
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const assets = [
  {
    name: 'Dashboard_Refined_Ritual',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0uggneRAlrRirOcXVme1giZUfrwJeF88IYKv5KBLBb4XVLxMatp-ASLa2Wv_E1G88MbIBLb4QtFaLSvXQWOcyhMCBCGKvpNLkgy_Kd7AvNB4M93nYSbjN-1H0tZ13azy1uUAJsNOqxAcpNU19koHMGAb6AtC1iYRqnTqN9f-JAt1wCAyE_wiSiA1e2IkKAQnJlFBQ05xwWqLYjUGl-tZiAmlPlRRDKW1hoXb93M45dj1FH_Luo7-xWQjAQ',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2NlZjQ4YjQ2NzNlMDQ5YTY4MjM5MGIzMzdmNzc1OTMzEgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Partner_Program_1',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0ugPdmpinYcXU2HDl60apGHXxV-7a6U_6ADw43iHxj62CvUVA9eJLreTT3dyiVKnn88o7BPHHr5U_26A_Kvk2vIte7xRSBjGiyDmoQcmD-XAqmExmgr9tJvN9VEKDxKu9CoJtw2Bi7AjPH2_eVXTDcMrWrS5qzfqA0c-on4Oh1TE2zgvKc4YeMyV6yFiwtmC3HuZs6ntsFRWHbGYUE4Z6O_cwNGTserzZyL6hxBEgwLmOr47xe8dbLm8SEs',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2E1NTViZTM5ODBhNTQxMzViYjk2ZTk2OGYyMGIyZWEwEgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Login_Sign_Up_1',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0uirRKERiEn8rkHeCIuUTHDQGh8XI2AAZ5l0PTbq_5u3dixr7CKjDsR2mnMY-pth7e-9HWTqD5o4cXDBmykBng0nIBXZvyEcf_rgZ1f7kZQs5LL68d6CXU6UioMPhY-ghTsIQqT-G0oNCP_z0tGTeeevLpI1W8v1dDjJdocnvH8tahHJ2L8fir90GFSuGSKnSvn6sPui9Fp9FC7qJzoxXDoANWaAEjotuivdvgB4XqvdCEzwzFdUNRgZVgA',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2Y3OTY0YTQ5YWU0YjQ3OTJiODAwZmRmMzZhNmQxMjY5EgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Dashboard_Jelly_Flavors_1',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0uj87uGHr_5ZW0Mi8khsfu6cA8uYfZiE0FG1utipyyTNK2JddSKzkZIVjgE3z3Z3jAAEUi3GNKQJWTe1YX94n0yyMyqPxKYwJlMMFI1TaTF5gzc-u27G41UksSSkKbJvXWkp861_C04BVhrUuS5zDGLLDxct9TjILV1eYMiyELIJtuk0GEPobpZcy3WBhaorg9dVJ2fvcX9y3AqRLwPahAIRW06Q1vsl_xx_JaOFk0pgeKkl7kIwuzC7q8Y',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzU1NzQ5OGZhNzFhNTRjMDY4NGU3NWVlY2Y1NTdiMWZlEgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Partner_Program_2',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0uiqh3qTPVgorj5e3yu0v12ajGqIjOPWvGEv59ykMjWa7gC-rIZyA59zLAPweaIywtkTm-Wr-bCvUmKoJ9MYYEJpXKi_37x8ysxhf3si7N6wGGldqxC9U6_SR094cBitY91Ad_YPclx4Hjc9D_NQ-T-h59WcLaGTRsfpvGnJJVDAgga_SUmtr-2RZMgsnc0Zdxbzwo2p3VN5v0kKEJfzRKF2UCSurPocyzlkdcVY_mRqYLeuqL9TMzB81jc',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzdhZjVhZGYzOWFmYzQ1ZWE4OGJhMGY1ZTc0MjgwNGQxEgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Dashboard_Jelly_Flavors_2',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0uh5r_IogW-4QXeVDbXJYnIiF5W8QuRIWoqGLZ04bB8sTp32kNZzMZA8ITtNlFN_PBYVapA_KIFgmu4Qk0fq58nTx2kXWbh4FhUlh2lCGU9U9riFavkqngF9jkLaRIEqyG33PIPO9YuN5m44oSrcK_zxJc522gteseCaG48v8kqoDxbcZX1gseKFSLpuqW7HiDbSgRDNPBMHrelIMmH1xbIoXhDGzLFrmEj-TTo2bKzwl0Koo25pzf3y9pU',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzFkZWFlNjQzOWJhYjRkNzVhZWM5NjRlNTA4ZTJiMWYyEgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  },
  {
    name: 'Login_Sign_Up_2',
    screenshot: 'https://lh3.googleusercontent.com/aida/ADBb0ugqU3Kw2NTublVFf-iFTtTlgxOB_ZjlYHbPmNRd6vatFGUUK7hDp5VROZpPyGGTAUy2ugGF2V5F5PXSritT6owPAeoDGP5CaZDIi5-XOun4tqxgim6pRJ-Uhq3NHfm0GufX8lSh-YojLLMjgIhgs0uz4iKgmYvvGmjuvbydU6YvkBsQpQBfJKyXmeH2tdu3VfJn9mtaQbV2XRNkyTyReaVGCEuIP3uMxa-dDURwW0SZDw72jXTatYVko6s',
    html: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sXzk4YzVmY2VhYWFiZjQwZTlhYjE0NTY1NmZlYmQ2YTg1EgsSBxCUx5Gz7BYYAZIBIwoKcHJvamVjdF9pZBIVQhM5MTc1OTQ0NjA1NDIzNjkxNDI3&filename=&opi=89354086'
  }
];

assets.forEach(asset => {
  if (asset.html) {
    const file = fs.createWriteStream(path.join(dir, asset.name + '.html'));
    https.get(asset.html, response => response.pipe(file));
  }
  if (asset.screenshot) {
    const img = fs.createWriteStream(path.join(dir, asset.name + '.png'));
    https.get(asset.screenshot, response => response.pipe(img));
  }
});
console.log("Downloads started");
