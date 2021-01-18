import { createLogger } from '@unly/utils-simple-logger';
import deepmerge from 'deepmerge';
import find from 'lodash.find';
import size from 'lodash.size';
import {
  GetStaticPaths,
  GetStaticProps,
  GetStaticPropsResult,
  NextPage,
} from 'next';
// eslint-disable-next-line @typescript-eslint/no-unused-vars,no-unused-vars
import React from 'react';
import {
  Alert,
  Container,
} from 'reactstrap';

import AllProducts from '@/common/components/dataDisplay/AllProducts';
import NativeFeaturesSidebar from '@/common/components/nrnDoc/NativeFeaturesSidebar';
import DefaultLayout from '@/common/components/layouts/DefaultLayout';
import DisplayOnBrowserMount from '@/common/components/rehydration/DisplayOnBrowserMount';
import ExternalLink from '@/common/components/dataDisplay/ExternalLink';
import useCustomer from '@/modules/data/hooks/useCustomer';
import useI18n, { I18n } from '@/modules/i18n/hooks/useI18n';
import { AirtableRecord } from '@/modules/data/types/AirtableRecord';
import { Customer } from '@/modules/data/types/Customer';
import { Product } from '@/modules/data/types/Product';
import { SanitizedAirtableDataset } from '@/modules/data/types/SanitizedAirtableDataset';
import { CommonServerSideParams } from '@/modules/bootstrapping/types/CommonServerSideParams';
import { StaticPropsInput } from '@/modules/bootstrapping/types/StaticPropsInput';
import { OnlyBrowserPageProps } from '@/modules/app/types/OnlyBrowserPageProps';
import { SSGPageProps } from '@/modules/app/types/SSGPageProps';
import deserializeSafe from '@/modules/serializeSafe/deserializeSafe';
import { getExamplesCommonStaticPaths, getExamplesCommonStaticProps } from '@/modules/app/SSG';
import timeDifference from '@/modules/date/timeDifference';

const fileLabel = 'pages/[locale]/examples/native-features/example-with-ssg-and-revalidate';
const logger = createLogger({ // eslint-disable-line no-unused-vars,@typescript-eslint/no-unused-vars
  label: fileLabel,
});

const regenerationDelay = 30; // Seconds

/**
 * Only executed on the server side at build time
 * Necessary when a page has dynamic routes and uses "getStaticProps"
 */
export const getStaticPaths: GetStaticPaths<CommonServerSideParams> = getExamplesCommonStaticPaths;

/**
 * Only executed on the server side at build time.
 *
 * @return Props (as "SSGPageProps") that will be passed to the Page component, as props
 *
 * @see https://github.com/vercel/next.js/discussions/10949#discussioncomment-6884
 * @see https://nextjs.org/docs/basic-features/data-fetching#getstaticprops-static-generation
 */
export const getStaticProps: GetStaticProps<SSGPageProps, CommonServerSideParams> = async (props: StaticPropsInput): Promise<GetStaticPropsResult<SSGPageProps>> => {
  const commonStaticProps: GetStaticPropsResult<SSGPageProps> = await getExamplesCommonStaticProps(props);

  if ('props' in commonStaticProps) {
    const { serializedDataset } = commonStaticProps?.props || {};
    const dataset: SanitizedAirtableDataset = deserializeSafe(serializedDataset);
    const customer: AirtableRecord<Customer> = find(dataset, { __typename: 'Customer' }) as AirtableRecord<Customer>;

    return deepmerge(commonStaticProps, {
      props: {
        products: customer?.products, // XXX What's the best way to store page-specific variables coming from props? with "customer" it was different because it's injected in all pages
        builtAt: new Date().toISOString(),
      },
      revalidate: regenerationDelay,
    });
  } else {
    return commonStaticProps;
  }
};

/**
 * SSG pages are first rendered by the server (during static bundling)
 * Then, they're rendered by the client, and gain additional props (defined in OnlyBrowserPageProps)
 * Because this last case is the most common (server bundle only happens during development stage), we consider it a default
 * To represent this behaviour, we use the native Partial TS keyword to make all OnlyBrowserPageProps optional
 *
 * Beware props in OnlyBrowserPageProps are not available on the server
 */
type Props = {
  builtAt: string;
} & SSGPageProps<Partial<OnlyBrowserPageProps>>;

const ProductsWithSSGPage: NextPage<Props> = (props): JSX.Element => {
  const { builtAt } = props;
  const customer: Customer = useCustomer();
  const products: AirtableRecord<Product>[] = customer?.products;
  const { locale }: I18n = useI18n();

  return (
    <DefaultLayout
      {...props}
      pageName={'examples'}
      headProps={{
        seoTitle: `${size(products)} products (SSG with revalidate) - Next Right Now`,
      }}
      Sidebar={NativeFeaturesSidebar}
    >
      <Container
        className={'container-white'}
      >
        <h1>Example, using SSG with revalidate option </h1>

        <Alert color={'info'}>
          This page will always be rendered statically, but the static bundle may be built either when deploying the website (AKA "pre-built"), or on-demand.<br />
          <br />
          When it is built "on-demand", the existing static version gets displayed to the end-user immediately, and a rebuild is performed in the background.<br />
          The next user who load this page will get the newer static version.<br />
          <br />
          The max age of this page has been set to {regenerationDelay} seconds. <br />
          <br />
          By using incremental static regeneration, this page is kept up-to-date automatically, based on how often users open the page. <br />
          Of course, a few users will see outdated information, but it's not really an issue here.<br />
          <br />
          If you use <ExternalLink href={''}>Stacker</ExternalLink> and update the products there,{' '}
          then when you refresh the page (once the delay of {regenerationDelay} seconds has passed) then the whole page will be statically regenerated.<br />
          And then, you'll have to refresh once again to see the new static version.
        </Alert>

        <hr />

        <Alert color={'warning'}>
          <DisplayOnBrowserMount>
            The page was built at: {builtAt} ({timeDifference(new Date(), new Date(builtAt))})
            {' - '}
            <a href={`/${locale}/examples/native-features/example-with-ssg-and-revalidate`}>Refresh</a>
          </DisplayOnBrowserMount>
        </Alert>

        <Alert color={'warning'}>
          In development mode and when the preview mode is enabled on staging, it is not possible to simulate <code>revalidate</code> mode properly.<br />
          Each page refresh will completely refresh the page, any previous build will be ignored, and <code>builtAt</code> will be reset.
        </Alert>

        <AllProducts products={products} />
      </Container>
    </DefaultLayout>
  );
};

export default (ProductsWithSSGPage);
