import qs from "query-string";
import {getProperty} from 'dot-prop';
import listingConf from './listing_config.json';

// # ------------ #
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
  console.log(res.status)
  return await res.json();
};

// # ------------ #

// For each company in listing
Object.keys(listingConf).forEach(company => {
  const { url, query, positions_key } = listingConf[company];
  const target = qs.stringifyUrl({ url, query });
  // Get one page of results
  getBody(target, headers).then((body) => console.log(getProperty(body, positions_key)));

  // TODO: Get multiple pages without api timeouts

  // TODO: Persist results somewhere
});

// TODO: Compute diff b/w persisted results
