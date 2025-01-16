import qs from "query-string";

// # ------------ #
const url = "https://paypal.eightfold.ai/api/apply/v2/jobs";
const query = {
  domain: ["paypal.com"],
  location: "United States",
  query: "Engineering",
  start: "0",
  num: "25",
  sort_by: "relevance",
};
const target = qs.stringifyUrl({ url, query });

const headers = {
  "content-type": "application/json",
};

// # ------------ #

const getBody = async (url, headers) => {
  const res = await fetch(url, {
    headers: headers,
    method: "GET",
    body: null,
  });
  return await res.json();
};

// # ------------ #

// Get one page of results
getBody(target, headers).then((body) => console.log(body?.positions));

// TODO: Get multiple pages without api timeouts

// TODO: Get from multiple domains
