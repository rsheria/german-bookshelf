import React from 'react';
import { Box, Heading, Text, Button, Center, VStack } from '@chakra-ui/react';
import { Link } from 'react-router-dom';

/**
 * NotFoundPage component displayed when a user navigates to a non-existent route
 */
const NotFoundPage: React.FC = () => {
  return (
    <Center minHeight="70vh">
      <VStack spacing={6} textAlign="center" p={5}>
        <Heading as="h1" size="xl">
          404 - Page Not Found
        </Heading>
        <Text fontSize="lg">
          The page you are looking for doesn't exist or has been moved.
        </Text>
        <Box>
          <Button
            as={Link}
            to="/"
            colorScheme="blue"
            size="md"
          >
            Back to Home
          </Button>
        </Box>
      </VStack>
    </Center>
  );
};

export default NotFoundPage;
