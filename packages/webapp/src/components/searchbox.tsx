'use client';
import * as AI from 'ai-jsx/react';
import { useState, ReactNode, useEffect } from 'react';

import { Avatar, Card, Container, Input, Loading, Grid, Text } from '@nextui-org/react';
import { BiSearch, BiUser } from 'react-icons/bi';
import { AiFillRobot } from 'react-icons/ai';
import { PiRobot } from 'react-icons/pi';
import { SiRobotframework } from 'react-icons/si';

interface MessageType {
  text: ReactNode;
  loading: boolean;
  type: 'query' | 'response';
  timestamp: number;
}

export function SearchBox({ podcastSlug, endpoint }: { podcastSlug: string; endpoint: string }) {
  const [userQuery, setUserQuery] = useState('');
  const [polling, setPolling] = useState(false);
  const [history, setHistory] = useState([] as MessageType[]);

  const { current, fetchAI } = AI.useAIStream({
    onComplete(final) {
      setHistory((previous) =>
        previous.concat([
          {
            text: final,
            loading: false,
            type: 'response',
            timestamp: Date.now(),
          },
        ])
      );
      setPolling(false);
      return null;
    },
  });

  function send() {
    const messages = [
      ...history,
      {
        text: userQuery,
        loading: false,
        type: 'query',
        timestamp: Date.now(),
      } as MessageType,
    ];
    setUserQuery('');
    setPolling(true);
    setHistory(messages);
    fetchAI(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages.map((m) => m.text) }),
    });
  }

  return (
    <Container>
      <Grid.Container justify="center" gap={1} css={{ width: '100%' }}>
        <Grid xs={12}>
          <Input
            placeholder={`Ask me anything about the ${podcastSlug} podcast`}
            bordered={true}
            rounded
            size="xl"
            fullWidth
            readOnly={polling}
            disabled={polling}
            color="primary"
            contentLeft={polling ? <Loading size="sm" type="points-opacity" /> : <BiSearch />}
            onChange={(e) => {
              setUserQuery(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                send();
              }
            }}
          />
        </Grid>
      </Grid.Container>
      <Grid.Container justify="center" gap={1} css={{ width: '100%' }}>
        <Grid xs={12}>
          <SearchResults
            results={
              current
                ? history.concat({
                    text: current,
                    loading: true,
                    type: 'response',
                    timestamp: Date.now(),
                  })
                : history
            }
          />
        </Grid>
      </Grid.Container>
    </Container>
  );
}

/**
 * Represents a single message in a chat session.
 */
function Message({ message }: { message: MessageType }) {
  // TODO: Can we use ReactMarkdown or just stick to components that AIStream can return?
  return (
    <Container>
      <Card>
        <Card.Body>
          <Grid.Container gap={1} justify="flex-start" alignItems="center">
            <Grid xs={1}>
              {message.loading ? (
                <Loading />
              ) : message.type === 'response' ? (
                <PiRobot size={25} />
              ) : (
                <BiUser size={25} />
              )}
            </Grid>
            <Grid xs={10}>
              {message.type === 'response' ? (
                <Text css={message.loading ? { color: 'gray' } : {}}>{message.text}</Text>
              ) : (
                <Text size={'$xl'}>{message.text}</Text>
              )}
            </Grid>
          </Grid.Container>
        </Card.Body>
      </Card>
    </Container>
  );
}

/**
 * Represents result messages in a search session.
 */
function SearchResults({ results }: { results: MessageType[] }) {
  // We show the most recent query first.
  let messages = results.sort((a, b) => b.timestamp - a.timestamp);

  return (
    <Container>
      <Grid.Container justify="center" gap={1} css={{ width: '100%' }}>
        {messages.map((message, id) => (
          <Grid xs={12} key={id}>
            <Message message={message} />
          </Grid>
        ))}
      </Grid.Container>
    </Container>
  );
}
